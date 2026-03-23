from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.task import Task, TaskStatus
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse
from datetime import datetime

router = APIRouter()


@router.get("/{task_id}/subtasks", response_model=List[TaskResponse])
async def get_subtasks(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parent = db.query(Task).filter(Task.id == task_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Задача не найдена")

    subtasks = (
        db.query(Task)
        .filter(Task.parent_id == task_id)
        .order_by(Task.position, Task.created_at)
        .all()
    )
    return subtasks


@router.post("/{task_id}/subtasks", response_model=TaskResponse, status_code=201)
async def create_subtask(
    task_id: UUID,
    subtask_data: TaskCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    parent = db.query(Task).filter(Task.id == task_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="Родительская задача не найдена")

    subtask = Task(
        **subtask_data.model_dump(exclude={"label_ids", "parent_id"}),
        parent_id=task_id,
        assignee_id=current_user.id,
        project_id=parent.project_id,
    )
    db.add(subtask)
    db.commit()
    db.refresh(subtask)
    return subtask


@router.patch("/{task_id}/subtasks/{subtask_id}", response_model=TaskResponse)
async def update_subtask(
    task_id: UUID,
    subtask_id: UUID,
    update_data: TaskUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtask = (
        db.query(Task)
        .filter(Task.id == subtask_id, Task.parent_id == task_id)
        .first()
    )
    if not subtask:
        raise HTTPException(status_code=404, detail="Подзадача не найдена")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(subtask, key, value)

    if update_data.status == TaskStatus.DONE and not subtask.completed_at:
        subtask.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(subtask)
    return subtask


@router.delete("/{task_id}/subtasks/{subtask_id}", status_code=204)
async def delete_subtask(
    task_id: UUID,
    subtask_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtask = (
        db.query(Task)
        .filter(Task.id == subtask_id, Task.parent_id == task_id)
        .first()
    )
    if not subtask:
        raise HTTPException(status_code=404, detail="Подзадача не найдена")

    db.delete(subtask)
    db.commit()
    return None


@router.get("/{task_id}/subtasks/progress")
async def get_subtask_progress(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    subtasks = db.query(Task).filter(Task.parent_id == task_id).all()
    total = len(subtasks)
    done = len([s for s in subtasks if s.status == TaskStatus.DONE])
    return {
        "total": total,
        "done": done,
        "progress": round((done / total) * 100) if total > 0 else 0,
    }
