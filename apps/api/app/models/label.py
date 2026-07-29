"""Label ORM model.

Changes
-------
- owner_id: nullable=False (was nullable=True during migration window;
  migration 0002 backfills existing rows and sets NOT NULL constraint).
- Explicit indexes on owner_id and task_labels FKs.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


task_labels = Table(
    "task_labels",
    Base.metadata,
    Column(
        "task_id",
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "label_id",
        UUID(as_uuid=True),
        ForeignKey("labels.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Label(Base):
    __tablename__ = "labels"
    __table_args__ = (
        Index("ix_labels_owner_id", "owner_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#38bdf8", nullable=False)
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,  # tightened — migration 0002 backfills and sets NOT NULL
        index=False,     # index declared above in __table_args__
    )
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    tasks = relationship("Task", secondary=task_labels, back_populates="labels")
