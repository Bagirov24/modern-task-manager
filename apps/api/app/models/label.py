"""Label ORM model.

Fixes
-----
- Added owner_id FK so labels are scoped to a user (was global).
  Requires migration: alembic revision --autogenerate -m 'add label owner_id'
- DateTime → DateTime(timezone=True): stores as TIMESTAMPTZ.
- datetime.utcnow → _utcnow() helper.
- Added cascade on task_labels FK constraints.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Table
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

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    color = Column(String(7), default="#38bdf8", nullable=False)
    # owner_id scopes labels to a user — was previously a global table.
    # NOTE: requires migration to add this column to existing deployments.
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=True,   # nullable during migration; tighten to False after backfill
        index=True,
    )
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    tasks = relationship("Task", secondary=task_labels, back_populates="labels")
