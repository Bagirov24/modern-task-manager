from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from sqlalchemy.orm import joinedload
from uuid import UUID
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone

from app.models.task import Task, TaskStatus, TaskPriority
from app.schemas.task import TaskCreate, TaskUpdate


class TaskService:
    """Business-logic layer for Task operations.

    All methods are async and accept an AsyncSession injected via FastAPI
    Depends(get_db).  No blocking I/O is performed.
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    async def create_task(self, task_data: TaskCreate, user_id: UUID) -> Task:
        task = Task(
            **task_data.model_dump(exclude={"label_ids"}),
            assignee_id=user_id,
        )
        self.db.add(task)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def update_task(
        self, task_id: UUID, task_data: TaskUpdate, owner_id: UUID
    ) -> Optional[Task]:
        task = await self.get_task(task_id, owner_id)
        if not task:
            return None
        update_data = task_data.model_dump(exclude_unset=True)
        # Auto-set completed_at when marking done
        if update_data.get("status") == TaskStatus.DONE and not task.completed_at:
            update_data["completed_at"] = datetime.now(timezone.utc)
        for field, value in update_data.items():
            setattr(task, field, value)
        await self.db.commit()
        await self.db.refresh(task)
        return task

    async def delete_task(self, task_id: UUID, owner_id: UUID) -> bool:
        task = await self.get_task(task_id, owner_id)
        if not task:
            return False
        await self.db.delete(task)
        await self.db.commit()
        return True

    async def complete_task(self, task_id: UUID, owner_id: UUID) -> Optional[Task]:
        task = await self.get_task(task_id, owner_id)
        if task:
            task.status = TaskStatus.DONE
            task.completed_at = datetime.now(timezone.utc)
            await self.db.commit()
            await self.db.refresh(task)
        return task

    async def reorder_tasks(self, task_ids: List[UUID], owner_id: UUID) -> None:
        for position, task_id in enumerate(task_ids):
            task = await self.get_task(task_id, owner_id)
            if task:
                task.position = position
        await self.db.commit()

    # ------------------------------------------------------------------
    # Read operations
    # ------------------------------------------------------------------

    async def get_task(self, task_id: UUID, owner_id: UUID) -> Optional[Task]:
        """Fetch a single task, enforcing ownership (prevents IDOR)."""
        result = await self.db.execute(
            select(Task)
            .options(joinedload(Task.assignee), joinedload(Task.labels))
            .where(Task.id == task_id, Task.assignee_id == owner_id)
        )
        return result.scalars().first()

    async def get_tasks(
        self,
        user_id: UUID,
        status: Optional[TaskStatus] = None,
        priority: Optional[TaskPriority] = None,
        project_id: Optional[UUID] = None,
        search: Optional[str] = None,
        page: int = 1,
        per_page: int = 20,
    ) -> Dict[str, Any]:
        query = (
            select(Task)
            .options(joinedload(Task.assignee), joinedload(Task.labels))
            .where(Task.assignee_id == user_id)
        )
        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)
        if project_id:
            query = query.where(Task.project_id == project_id)
        if search:
            query = query.where(Task.title.ilike(f"%{search}%"))

        count_result = await self.db.execute(
            select(func.count()).select_from(query.subquery())
        )
        total = count_result.scalar_one()

        result = await self.db.execute(
            query.order_by(Task.position).offset((page - 1) * per_page).limit(per_page)
        )
        tasks = result.scalars().unique().all()
        return {"tasks": tasks, "total": total, "page": page, "per_page": per_page}

    async def get_overdue_tasks(self, user_id: UUID) -> List[Task]:
        result = await self.db.execute(
            select(Task).where(
                Task.assignee_id == user_id,
                Task.status != TaskStatus.DONE,
                Task.due_date < datetime.now(timezone.utc),
            )
        )
        return result.scalars().all()

    async def get_today_tasks(self, user_id: UUID) -> List[Task]:
        today = datetime.now(timezone.utc).date()
        tomorrow = today + timedelta(days=1)
        result = await self.db.execute(
            select(Task).where(
                Task.assignee_id == user_id,
                Task.due_date >= today,
                Task.due_date < tomorrow,
            )
        )
        return result.scalars().all()

    async def get_task_stats(self, user_id: UUID) -> Dict[str, int]:
        """Return task counts in a single SQL query (replaces 4 separate COUNTs)."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(
                func.count().label("total"),
                func.count(
                    case((Task.status == TaskStatus.DONE, 1))
                ).label("done"),
                func.count(
                    case((Task.status == TaskStatus.IN_PROGRESS, 1))
                ).label("in_progress"),
                func.count(
                    case(
                        (
                            (Task.status != TaskStatus.DONE)
                            & (Task.due_date < now),
                            1,
                        )
                    )
                ).label("overdue"),
            ).where(Task.assignee_id == user_id)
        )
        row = result.one()
        return {
            "total": row.total,
            "done": row.done,
            "in_progress": row.in_progress,
            "overdue": row.overdue,
            "todo": row.total - row.done - row.in_progress,
        }
