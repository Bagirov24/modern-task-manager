from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.communication_item import CommunicationItem
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.communication_item import CommunicationItemCreate, CommunicationItemResponse, CommunicationItemUpdate, CommunicationListResponse
from app.services.access_policy import accessible_project_ids, require_project_access

router = APIRouter()
ACTIVE_STATUSES = ("new", "needs_my_reply", "need_customer_input", "need_internal_input", "waiting_for_reply", "ready_to_respond", "fyi")


async def _visible(db: AsyncSession, item_id: UUID, user: User, *, write: bool = False) -> CommunicationItem:
    project_ids = await accessible_project_ids(db, user.id)
    item = (await db.execute(select(CommunicationItem).where(
        CommunicationItem.id == item_id,
        or_(CommunicationItem.created_by == user.id, CommunicationItem.action_owner_id == user.id, CommunicationItem.project_id.in_(project_ids)),
    ))).scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Communication item not found")
    if write and item.created_by != user.id and item.action_owner_id != user.id:
        await require_project_access(db, item.project_id, user.id, write=True)
    return item


@router.get("/", response_model=CommunicationListResponse)
async def list_items(
    action_status: str | None = None, project_id: UUID | None = None, task_id: UUID | None = None,
    search: str | None = Query(None, max_length=200), active_only: bool = True,
    page: int = Query(1, ge=1), per_page: int = Query(50, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    project_ids = await accessible_project_ids(db, current_user.id)
    scope = or_(CommunicationItem.created_by == current_user.id, CommunicationItem.action_owner_id == current_user.id, CommunicationItem.project_id.in_(project_ids))
    query = select(CommunicationItem).where(scope)
    if active_only:
        query = query.where(CommunicationItem.action_status.in_(ACTIVE_STATUSES))
    if action_status:
        query = query.where(CommunicationItem.action_status == action_status)
    if project_id:
        query = query.where(CommunicationItem.project_id == project_id)
    if task_id:
        query = query.where(CommunicationItem.task_id == task_id)
    if search:
        term = f"%{search}%"
        query = query.where(or_(CommunicationItem.sender_name.ilike(term), CommunicationItem.subject.ilike(term), CommunicationItem.body_preview.ilike(term), CommunicationItem.next_action.ilike(term)))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (await db.execute(query.order_by(CommunicationItem.importance.desc(), CommunicationItem.response_due_at.asc().nullslast(), CommunicationItem.received_at.desc()).offset((page - 1) * per_page).limit(per_page))).scalars().all()
    grouped = (await db.execute(select(CommunicationItem.action_status, func.count()).where(scope, CommunicationItem.action_status.in_(ACTIVE_STATUSES)).group_by(CommunicationItem.action_status))).all()
    return CommunicationListResponse(items=rows, total=total, groups=dict(grouped), page=page, per_page=per_page)


@router.post("/", response_model=CommunicationItemResponse, status_code=201)
async def create_item(data: CommunicationItemCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await require_project_access(db, data.project_id, current_user.id, write=True)
    values = data.model_dump(exclude={"received_at", "action_owner_id"})
    item = CommunicationItem(**values, received_at=data.received_at or datetime.now(timezone.utc), created_by=current_user.id, action_owner_id=data.action_owner_id or (current_user.id if data.needs_reply else None))
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/{item_id}", response_model=CommunicationItemResponse)
async def get_item(item_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await _visible(db, item_id, current_user)


@router.patch("/{item_id}", response_model=CommunicationItemResponse)
async def update_item(item_id: UUID, data: CommunicationItemUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = await _visible(db, item_id, current_user, write=True)
    values = data.model_dump(exclude_unset=True)
    if "project_id" in values:
        await require_project_access(db, data.project_id, current_user.id, write=True)
    for key, value in values.items():
        setattr(item, key, value)
    if data.action_status in ("done", "archived"):
        item.closed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return item


@router.post("/{item_id}/create-task", response_model=CommunicationItemResponse)
async def create_task_from_item(item_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = await _visible(db, item_id, current_user, write=True)
    if item.task_id:
        return item
    task = Task(
        title=(item.subject or item.body_preview.splitlines()[0])[:500], description=item.body_preview,
        project_id=item.project_id, assignee_id=current_user.id, manager_id=current_user.id,
        task_type="follow_up", workflow_status="inbox", status=TaskStatus.TODO,
        priority=TaskPriority.HIGH if item.importance in ("high", "critical") else TaskPriority.MEDIUM,
        response_due_at=item.response_due_at, next_action=item.next_action,
        next_action_description=item.next_action, next_action_owner_id=item.action_owner_id or current_user.id,
        waiting_for_user_id=item.waiting_for_user_id, waiting_for_party=item.waiting_for_party,
        communication_channel=item.source_type, last_external_communication_at=item.received_at,
    )
    db.add(task)
    await db.flush()
    item.task_id = task.id
    item.action_status = "done"
    item.closed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_item(item_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    item = await _visible(db, item_id, current_user, write=True)
    item.action_status = "archived"
    item.closed_at = datetime.now(timezone.utc)
    await db.commit()
