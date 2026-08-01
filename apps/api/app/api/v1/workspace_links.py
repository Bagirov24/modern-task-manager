from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import String, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.task import Task
from app.models.user import User
from app.models.workspace_link import WorkspaceLink, task_workspace_links
from app.schemas.workspace_link import (
    WorkspaceLinkCreate, WorkspaceLinkListResponse, WorkspaceLinkResponse, WorkspaceLinkUpdate,
)
from app.services.access_policy import accessible_project_ids, require_project_access

router = APIRouter()


def _query():
    return select(WorkspaceLink).options(selectinload(WorkspaceLink.project))


async def _visible_link(db: AsyncSession, link_id: UUID, user: User, *, write: bool = False) -> WorkspaceLink:
    projects = await accessible_project_ids(db, user.id)
    result = await db.execute(_query().where(
        WorkspaceLink.id == link_id,
        or_(WorkspaceLink.project_id.is_(None), WorkspaceLink.created_by == user.id, WorkspaceLink.project_id.in_(projects)),
    ))
    link = result.scalars().first()
    if not link:
        raise HTTPException(status_code=404, detail="Workspace link not found")
    if write and link.created_by != user.id:
        await require_project_access(db, link.project_id, user.id, write=True)
    return link


async def _accessible_task(db: AsyncSession, task_id: UUID, user: User, *, write: bool = False) -> Task:
    task = (await db.execute(select(Task).where(Task.id == task_id))).scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.assignee_id != user.id:
        await require_project_access(db, task.project_id, user.id, write=write)
    return task


@router.get("/tasks/{task_id}", response_model=list[WorkspaceLinkResponse])
async def list_task_links(task_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _accessible_task(db, task_id, current_user)
    projects = await accessible_project_ids(db, current_user.id)
    result = await db.execute(_query().join(task_workspace_links).where(
        task_workspace_links.c.task_id == task_id,
        or_(WorkspaceLink.project_id.is_(None), WorkspaceLink.created_by == current_user.id, WorkspaceLink.project_id.in_(projects)),
    ).order_by(WorkspaceLink.is_favorite.desc(), WorkspaceLink.sort_order, WorkspaceLink.title))
    return result.scalars().all()


@router.put("/tasks/{task_id}/{link_id}", response_model=WorkspaceLinkResponse)
async def attach_link_to_task(task_id: UUID, link_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    task = await _accessible_task(db, task_id, current_user, write=True)
    link = await _visible_link(db, link_id, current_user)
    if link.project_id and task.project_id != link.project_id:
        raise HTTPException(status_code=422, detail="Task and workspace link projects must match")
    exists = await db.execute(select(task_workspace_links).where(
        task_workspace_links.c.task_id == task_id, task_workspace_links.c.workspace_link_id == link_id,
    ))
    if not exists.first():
        await db.execute(task_workspace_links.insert().values(task_id=task_id, workspace_link_id=link_id))
        await db.commit()
    return link


@router.delete("/tasks/{task_id}/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def detach_link_from_task(task_id: UUID, link_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _accessible_task(db, task_id, current_user, write=True)
    await db.execute(task_workspace_links.delete().where(
        task_workspace_links.c.task_id == task_id, task_workspace_links.c.workspace_link_id == link_id,
    ))
    await db.commit()


@router.get("/", response_model=WorkspaceLinkListResponse)
async def list_workspace_links(
    search: str | None = Query(None, max_length=200), project_id: UUID | None = None, general_only: bool = False,
    category: str | None = Query(None, max_length=30), favorites_only: bool = False,
    page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    projects = await accessible_project_ids(db, current_user.id)
    query = _query().where(or_(WorkspaceLink.project_id.is_(None), WorkspaceLink.created_by == current_user.id, WorkspaceLink.project_id.in_(projects)))
    if general_only:
        query = query.where(WorkspaceLink.project_id.is_(None))
    elif project_id:
        query = query.where(WorkspaceLink.project_id == project_id)
    if category:
        query = query.where(WorkspaceLink.category == category)
    if favorites_only:
        query = query.where(WorkspaceLink.is_favorite.is_(True))
    if search:
        term = f"%{search}%"
        query = query.where(or_(WorkspaceLink.title.ilike(term), WorkspaceLink.description.ilike(term), WorkspaceLink.notes.ilike(term), WorkspaceLink.tags.cast(String).ilike(term)))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(query.order_by(WorkspaceLink.is_favorite.desc(), WorkspaceLink.sort_order, WorkspaceLink.title).offset((page - 1) * per_page).limit(per_page))
    return WorkspaceLinkListResponse(links=result.scalars().all(), total=total, page=page, per_page=per_page)


@router.post("/", response_model=WorkspaceLinkResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace_link(data: WorkspaceLinkCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await require_project_access(db, data.project_id, current_user.id, write=True)
    values = data.model_dump()
    values["url"] = str(data.url)
    link = WorkspaceLink(**values, created_by=current_user.id)
    db.add(link)
    await db.commit()
    return await _visible_link(db, link.id, current_user)


@router.get("/{link_id}", response_model=WorkspaceLinkResponse)
async def get_workspace_link(link_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await _visible_link(db, link_id, current_user)


@router.patch("/{link_id}", response_model=WorkspaceLinkResponse)
async def update_workspace_link(link_id: UUID, data: WorkspaceLinkUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    link = await _visible_link(db, link_id, current_user, write=True)
    values = data.model_dump(exclude_unset=True)
    if "project_id" in values:
        await require_project_access(db, data.project_id, current_user.id, write=True)
    if data.url is not None:
        values["url"] = str(data.url)
    for key, value in values.items():
        setattr(link, key, value)
    await db.commit()
    return await _visible_link(db, link.id, current_user)


@router.delete("/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace_link(link_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    link = await _visible_link(db, link_id, current_user, write=True)
    await db.delete(link)
    await db.commit()
