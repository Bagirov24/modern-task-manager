"""Task ORM model.

Indexes added
-------------
- project_id  — fast lookup of all tasks in a project
- assignee_id — fast lookup of all tasks for a user
- parent_id   — fast lookup of all subtasks of a task
All were FK columns without explicit indexes; PostgreSQL does not
auto-create indexes on FK columns (only on PK/UNIQUE).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Index, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskStatus(str, enum.Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    ARCHIVED = "archived"


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        # Explicit indexes on FK columns — PostgreSQL does NOT auto-index FKs.
        Index("ix_tasks_project_id", "project_id"),
        Index("ix_tasks_assignee_id", "assignee_id"),
        Index("ix_tasks_parent_id", "parent_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(Enum(TaskStatus), default=TaskStatus.TODO, nullable=False)
    priority = Column(Enum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    position = Column(Integer, default=0, nullable=False)

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
    )
    assignee_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    parent_id = Column(
        UUID(as_uuid=True),
        ForeignKey("tasks.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False
    )

    assignee = relationship("User", back_populates="tasks")
    project = relationship("Project", back_populates="tasks")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    subtasks = relationship("Task", backref="parent", remote_side=[id])
    labels = relationship("Label", secondary="task_labels", back_populates="tasks")
