from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from typing import Optional, List
from datetime import datetime

from app.models.task import Task, TaskStatus
from app.schemas.subtask import SubtaskCreate, SubtaskUpdate


class SubtaskService:
    """Service for managing subtasks (tasks with parent_id)."""

    def __init__(self, db: Session):
        self.db = db

    def create_subtask(
        self, data: SubtaskCreate, parent_id: UUID
    ) -> Task:
        subtask = Task(
            title=data.title,
            description=data.description,
            status=data.status or TaskStatus.TODO,
            priority=data.priority,
            parent_id=parent_id,
            project_id=self._get_parent_project(parent_id),
            assignee_id=data.assignee_id,
        )
        self.db.add(subtask)
        self.db.commit()
        self.db.refresh(subtask)
        return subtask

    def get_subtasks(self, parent_id: UUID) -> List[Task]:
        return (
            self.db.query(Task)
            .filter(Task.parent_id == parent_id)
            .order_by(Task.position, Task.created_at)
            .all()
        )

    def get_subtask(self, subtask_id: UUID) -> Optional[Task]:
        return (
            self.db.query(Task)
            .filter(Task.id == subtask_id, Task.parent_id.isnot(None))
            .first()
        )

    def update_subtask(
        self, subtask_id: UUID, data: SubtaskUpdate
    ) -> Optional[Task]:
        subtask = self.get_subtask(subtask_id)
        if not subtask:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(subtask, field, value)
        subtask.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(subtask)
        return subtask

    def delete_subtask(self, subtask_id: UUID) -> bool:
        subtask = self.get_subtask(subtask_id)
        if not subtask:
            return False
        self.db.delete(subtask)
        self.db.commit()
        return True

    def toggle_subtask(self, subtask_id: UUID) -> Optional[Task]:
        subtask = self.get_subtask(subtask_id)
        if not subtask:
            return None
        if subtask.status == TaskStatus.DONE:
            subtask.status = TaskStatus.TODO
            subtask.completed_at = None
        else:
            subtask.status = TaskStatus.DONE
            subtask.completed_at = datetime.utcnow()
        subtask.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(subtask)
        return subtask

    def reorder_subtasks(self, subtask_ids: List[UUID]) -> None:
        for position, subtask_id in enumerate(subtask_ids):
            self.db.query(Task).filter(
                Task.id == subtask_id, Task.parent_id.isnot(None)
            ).update({"position": position})
        self.db.commit()

    def get_progress(self, parent_id: UUID) -> dict:
        total = (
            self.db.query(func.count(Task.id))
            .filter(Task.parent_id == parent_id)
            .scalar() or 0
        )
        completed = (
            self.db.query(func.count(Task.id))
            .filter(
                Task.parent_id == parent_id,
                Task.status == TaskStatus.DONE,
            )
            .scalar() or 0
        )
        return {
            "total": total,
            "completed": completed,
            "progress": round(completed / total * 100, 1) if total > 0 else 0,
        }

    def _get_parent_project(self, parent_id: UUID) -> Optional[UUID]:
        parent = self.db.query(Task).filter(Task.id == parent_id).first()
        return parent.project_id if parent else None
