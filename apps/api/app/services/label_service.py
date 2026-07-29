from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from uuid import UUID
from typing import Optional, List

from app.models.label import Label, task_labels
from app.models.task import Task
from app.schemas.label import LabelCreate, LabelUpdate


class LabelService:
    """Business-logic layer for Label operations.

    All methods are async; session is injected via FastAPI Depends(get_db).
    """

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create_label(self, data: LabelCreate) -> Label:
        label = Label(name=data.name, color=data.color)
        self.db.add(label)
        await self.db.commit()
        await self.db.refresh(label)
        return label

    async def get_label(self, label_id: UUID) -> Optional[Label]:
        result = await self.db.execute(
            select(Label).where(Label.id == label_id)
        )
        return result.scalars().first()

    async def get_all_labels(self) -> List[Label]:
        result = await self.db.execute(
            select(Label).order_by(Label.name)
        )
        return result.scalars().all()

    async def get_labels_with_task_count(self) -> List[dict]:
        result = await self.db.execute(
            select(
                Label,
                func.count(task_labels.c.task_id).label("task_count"),
            )
            .outerjoin(task_labels, Label.id == task_labels.c.label_id)
            .group_by(Label.id)
            .order_by(Label.name)
        )
        return [
            {"label": label, "task_count": count}
            for label, count in result.all()
        ]

    async def update_label(
        self, label_id: UUID, data: LabelUpdate
    ) -> Optional[Label]:
        result = await self.db.execute(
            select(Label).where(Label.id == label_id)
        )
        label = result.scalars().first()
        if not label:
            return None
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(label, field, value)
        await self.db.commit()
        await self.db.refresh(label)
        return label

    async def delete_label(self, label_id: UUID) -> bool:
        result = await self.db.execute(
            select(Label).where(Label.id == label_id)
        )
        label = result.scalars().first()
        if not label:
            return False
        await self.db.delete(label)
        await self.db.commit()
        return True

    async def assign_labels_to_task(
        self, task_id: UUID, label_ids: List[UUID]
    ) -> None:
        task_result = await self.db.execute(
            select(Task).options(selectinload(Task.labels)).where(Task.id == task_id)
        )
        task = task_result.scalars().first()
        if not task:
            return
        labels_result = await self.db.execute(
            select(Label).where(Label.id.in_(label_ids))
        )
        task.labels = labels_result.scalars().all()
        await self.db.commit()

    async def get_labels_for_task(self, task_id: UUID) -> List[Label]:
        task_result = await self.db.execute(
            select(Task).options(selectinload(Task.labels)).where(Task.id == task_id)
        )
        task = task_result.scalars().first()
        if not task:
            return []
        return list(task.labels)
