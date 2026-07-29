"""Project API endpoints.

N+1 prevention
--------------
list_projects uses joinedload(Project.owner) so that the owner's
username is fetched in the same SQL query rather than issuing one
query per row.

get_project_stats issues a single aggregated SQL query (func.count with
CASE-filter) — no per-task iteration.

Ownership
---------
_get_owned_project() enforces Project.owner_id == current_user.id on
every mutating and read endpoint.  Returns 404 (not 403) to avoid
leaking existence of projects owned by other users.
"""
from uuid import UUID
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.project import Project
from app.models.task import Task
from app.schemas.project import ProjectCreate, ProjectUpdate, ProjectResponse

router = APIRouter()


async def _get_owned_project(
    project_id: UUID, user_id, db: AsyncSession
) -> Project:
    """Fetch project with owner eagerly loaded; verify ownership.

    Returns 404 for both missing and not-owned projects to avoid
    leaking the existence of other users' projects.
    """
    result = await db.execute(
        select(Project)
        .options(joinedload(Project.owner))
        .where(
            Project.id == project_id,
            Project.owner_id == user_id,
        )
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    include_archived: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # joinedload(owner) prevents N+1: one JOIN instead of one query per project.
    query = (
        select(Project)
        .options(joinedload(Project.owner))
        .where(Project.owner_id == current_user.id)
    )
    if not include_archived:
        query = query.where(Project.is_archived == False)  # noqa: E712
    result = await db.execute(query)
    return result.scalars().all()


@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = Project(**data.model_dump(), owner_id=current_user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_owned_project(project_id, current_user.id, db)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    await db.delete(project)
    await db.commit()


@router.post("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    project.is_archived = True
    await db.commit()
    await db.refresh(project)
    return project


@router.get("/{project_id}/stats")
async def get_project_stats(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Ownership check first (raises 404 if not owned)
    await _get_owned_project(project_id, current_user.id, db)

    # Single aggregated query — no per-task N+1.
    result = await db.execute(
        select(
            func.count(Task.id).label("total"),
            func.count(Task.id)
            .filter(Task.status == "done")
            .label("completed"),
        ).where(Task.project_id == project_id)
    )
    row = result.one()
    total = row.total or 0
    completed = row.completed or 0
    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "progress": round(completed / total * 100) if total else 0,
    }
