from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload
from typing import Optional
from uuid import UUID
from datetime import datetime, timezone
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import Task, TaskStatus, TaskPriority
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskListResponse

router = APIRouter()


def _base_query(user_id):
    """Base select with eager-loaded relations to prevent N+1 queries."""
    return (
        select(Task)
        .options(
            joinedload(Task.assignee),
            joinedload(Task.project),
            joinedload(Task.labels),
        )
        .where(Task.assignee_id == user_id)
    )


@router.get("/", response_model=TaskListResponse)
async def list_tasks(
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    project_id: Optional[UUID] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _base_query(current_user.id)

    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if search:
        query = query.where(Task.title.ilike(f"%{search}%"))

    # Count total (without pagination)
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    # Paginate
    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    tasks = result.scalars().unique().all()

    return TaskListResponse(tasks=tasks, total=total, page=page, per_page=per_page)


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    task = Task(
        **task_data.model_dump(exclude={"label_ids"}),
        assignee_id=current_user.id,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        _base_query(current_user.id).where(Task.id == task_id)
    )
    task = result.scalars().unique().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG FIX: verify ownership — previously any auth'd user could update any task
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.assignee_id == current_user.id,
        )
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_data.model_dump(exclude_unset=True)
    if "status" in update_data and update_data["status"] == TaskStatus.DONE:
        update_data["completed_at"] = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # BUG FIX: verify ownership — previously any auth'd user could delete any task
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.assignee_id == current_user.id,
        )
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
