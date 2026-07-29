"""Notification ORM model.

Fixes
-----
- DateTime → DateTime(timezone=True): stores as TIMESTAMPTZ.
- datetime.utcnow → _utcnow() helper (timezone-aware).
- Added ondelete="CASCADE" on user_id FK so notifications are cleaned
  up automatically when a user is deleted.
- Added index=True on user_id for fast per-user queries.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base
import enum as python_enum


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class NotificationType(str, python_enum.Enum):
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    TASK_UPDATED = "task_updated"
    TASK_COMMENT = "task_comment"
    PROJECT_INVITE = "project_invite"
    MENTION = "mention"
    DEADLINE = "deadline"
    SYSTEM = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(Enum(NotificationType), default=NotificationType.SYSTEM, nullable=False)
    title = Column(String(500), nullable=False)
    message = Column(Text)
    is_read = Column(Boolean, default=False, nullable=False)
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    task_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )
    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    user = relationship("User", backref="notifications")
    task = relationship("Task", backref="notifications")
    project = relationship("Project", backref="notifications")
