from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List, Dict, Any
from app.models.task import Task, TaskStatus, TaskPriority
from app.schemas.task import TaskCreate, TaskUpdate
from datetime import datetime, timedelta


class TaskService:
    def __init__(self, db: Session):
        self.db = db

    def create_task(self, task_data: TaskCreate, user_id: UUID) -> Task:
        task = Task(
            **task_data.model_dump(exclude={"label_ids"}),
            assignee_id=user_id,
        )
        self.db.add(task)
        self.db.commit()
        self.db.refresh(task)
        return task

    def get_task(self, task_id: UUID) -> Optional[Task]:
        return self.db.query(Task).filter(Task.id == task_id).first()

    def get_tasks(
        self,
        user_id: UUID,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        project_id: Optional[UUID] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Dict[str, Any]:
        query = self.db.query(Task).filter(Task.assignee_id == user_id)

        if status:
            query = query.filter(Task.status == status)
        if priority:
            query = query.filter(Task.priority == priority)
        if project_id:
            query = query.filter(Task.project_id == project_id)
        if search:
            query = query.filter(Task.title.ilike(f"%{search}%"))

        total = query.count()
        tasks = query.order_by(Task.position).offset((page - 1) * per_page).limit(per_page).all()

        return {"tasks": tasks, "total": total, "page": page, "per_page": per_page}

    def update_task(self, task_id: UUID, task_data: TaskUpdate) -> Optional[Task]:
        task = self.get_task(task_id)
        if not task:
            return None
        update_data = task_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(task, field, value)
        task.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(task)
        return task

    def delete_task(self, task_id: UUID) -> bool:
        task = self.get_task(task_id)
        if not task:
            return False
        self.db.delete(task)
        self.db.commit()
        return True

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
        task = self.get_task(task_id)
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

    def get_task_stats(self, user_id: UUID) -> Dict[str, int]:
        total = self.db.query(Task).filter(Task.assignee_id == user_id).count()
        done = self.db.query(Task).filter(
            Task.assignee_id == user_id, Task.status == TaskStatus.DONE
        ).count()
        in_progress = self.db.query(Task).filter(
            Task.assignee_id == user_id, Task.status == TaskStatus.IN_PROGRESS
        ).count()
        overdue = len(self.get_overdue_tasks(user_id))
        return {
            "total": total,
            "done": done,
            "in_progress": in_progress,
            "overdue": overdue,
            "todo": total - done - in_progress,
        }
