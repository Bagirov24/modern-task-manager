"""Subtasks API endpoints.

Fixes applied
-------------
- Converted from sync ``Session`` to ``AsyncSession``.
- ``datetime.utcnow()`` replaced with ``datetime.now(timezone.utc)``.
- ``get_subtask_progress``: single aggregated SQL query instead of
  loading all subtasks into Python and counting in a list comprehension.
- Ownership guard: the parent task must be assigned to ``current_user``.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate

router = APIRouter()


async def _get_parent(task_id: UUID, user_id, db: AsyncSession) -> Task:
    """Fetch parent task and enforce ownership (returns 404 on miss or not-owned)."""
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.assignee_id == user_id,
        )
    )
    parent = result.scalars().first()
    if not parent:
        raise HTTPException(status_code=404, detail="Task not found")
    return parent


@router.get("/{task_id}/subtasks", response_model=List[TaskResponse])
async def get_subtasks(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_parent(task_id, current_user.id, db)
    result = await db.execute(
        select(Task)
        .where(Task.parent_id == task_id)
        .order_by(Task.position, Task.created_at)
    )
    return result.scalars().all()


@router.post("/{task_id}/subtasks", response_model=TaskResponse, status_code=201)
async def create_subtask(
    task_id: UUID,
    subtask_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parent = await _get_parent(task_id, current_user.id, db)
    subtask = Task(
        **subtask_data.model_dump(exclude={"label_ids", "parent_id"}),
        parent_id=task_id,
        assignee_id=current_user.id,
        project_id=parent.project_id,
    )
    db.add(subtask)
    await db.commit()
    await db.refresh(subtask)
    return subtask


@router.patch(
    "/{task_id}/subtasks/{subtask_id}", response_model=TaskResponse
)
async def update_subtask(
    task_id: UUID,
    subtask_id: UUID,
    update_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_parent(task_id, current_user.id, db)
    result = await db.execute(
        select(Task).where(
            Task.id == subtask_id,
            Task.parent_id == task_id,
        )
    )
    subtask = result.scalars().first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")

    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(subtask, key, value)

    # Use timezone-aware UTC — never datetime.utcnow() (naive, deprecated).
    if update_data.status == TaskStatus.DONE and not subtask.completed_at:
        subtask.completed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(subtask)
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=204)
async def delete_subtask(
    task_id: UUID,
    subtask_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_parent(task_id, current_user.id, db)
    result = await db.execute(
        select(Task).where(
            Task.id == subtask_id,
            Task.parent_id == task_id,
        )
    )
    subtask = result.scalars().first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    await db.delete(subtask)
    await db.commit()


@router.get("/{task_id}/subtasks/progress")
async def get_subtask_progress(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    await _get_parent(task_id, current_user.id, db)
    # Single aggregated SQL query — no Python list comprehension over ORM objects.
    result = await db.execute(
        select(
            func.count(Task.id).label("total"),
            func.count(
                case((Task.status == TaskStatus.DONE, Task.id))
            ).label("done"),
        ).where(Task.parent_id == task_id)
    )
    row = result.one()
    total = row.total or 0
    done = row.done or 0
    return {
        "total": total,
        "done": done,
        "progress": round(done / total * 100) if total else 0,
    }
