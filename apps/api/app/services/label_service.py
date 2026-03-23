from sqlalchemy.orm import Session
from sqlalchemy import func
from uuid import UUID
from typing import Optional, List

from app.models.label import Label, task_labels
from app.models.task import Task
from app.schemas.label import LabelCreate, LabelUpdate


class LabelService:
    def __init__(self, db: Session):
        self.db = db

    def create_label(self, data: LabelCreate) -> Label:
        label = Label(
            name=data.name,
            color=data.color,
        )
        self.db.add(label)
        self.db.commit()
        self.db.refresh(label)
        return label

    def get_label(self, label_id: UUID) -> Optional[Label]:
        return self.db.query(Label).filter(Label.id == label_id).first()

    def get_all_labels(self) -> List[Label]:
        return self.db.query(Label).order_by(Label.name).all()

    def get_labels_with_task_count(self) -> List[dict]:
        results = (
            self.db.query(
                Label,
                func.count(task_labels.c.task_id).label("task_count"),
            )
            .outerjoin(task_labels, Label.id == task_labels.c.label_id)
            .group_by(Label.id)
            .order_by(Label.name)
            .all()
        )
        return [
            {
                "label": label,
                "task_count": count,
            }
            for label, count in results
        ]

    def update_label(
        self, label_id: UUID, data: LabelUpdate
    ) -> Optional[Label]:
        label = self.db.query(Label).filter(Label.id == label_id).first()
        if not label:
            return None
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(label, field, value)
        self.db.commit()
        self.db.refresh(label)
        return label

    def delete_label(self, label_id: UUID) -> bool:
        label = self.db.query(Label).filter(Label.id == label_id).first()
        if not label:
            return False
        self.db.delete(label)
        self.db.commit()
        return True

    def assign_labels_to_task(
        self, task_id: UUID, label_ids: List[UUID]
    ) -> None:
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return
        labels = (
            self.db.query(Label).filter(Label.id.in_(label_ids)).all()
        )
        task.labels = labels
        self.db.commit()

    def get_labels_for_task(self, task_id: UUID) -> List[Label]:
        task = self.db.query(Task).filter(Task.id == task_id).first()
        if not task:
            return []
        return task.labels
