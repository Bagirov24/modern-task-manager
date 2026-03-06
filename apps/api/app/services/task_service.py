from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from app.models.task import Task, TaskStatus
from datetime import datetime, timedelta


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def get_overdue_tasks(self, user_id: UUID) -> List[Task]:
        return self.db.query(Task).filter(
            Task.assignee_id == user_id,
            Task.status != TaskStatus.DONE,
            Task.due_date < datetime.utcnow(),
        ).all()

    def get_today_tasks(self, user_id: UUID) -> List[Task]:
        today = datetime.utcnow().date()
        return self.db.query(Task).filter(
            Task.assignee_id == user_id,
            Task.due_date >= today,
            Task.due_date < today + timedelta(days=1),
        ).all()

    def complete_task(self, task_id: UUID) -> Optional[Task]:
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = TaskStatus.DONE
            task.completed_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(task)
        return task

    def reorder_tasks(self, task_ids: List[UUID]) -> None:
        for position, task_id in enumerate(task_ids):
            self.db.query(Task).filter(Task.id == task_id).update({"position": position})
        self.db.commit()
