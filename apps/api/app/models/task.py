"""Task ORM model.

Indexes
-------
- project_id, assignee_id, parent_id — FK columns PostgreSQL does NOT
  auto-index; added explicitly to avoid seq-scans on common queries.

description_format
------------------
  Stores the format of the description field so the frontend knows how
  to render it:
    'plain'    — plain text (legacy / API clients)
    'markdown' — GitHub-flavoured Markdown
    'html'     — sanitised Tiptap HTML (default, Jira-like rich text)
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Index, Integer,
    String, Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base, enum_values


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


class DescriptionFormat(str, enum.Enum):
    PLAIN = "plain"
    MARKDOWN = "markdown"
    HTML = "html"  # Tiptap sanitised HTML — default


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_project_id", "project_id"),
        Index("ix_tasks_assignee_id", "assignee_id"),
        Index("ix_tasks_parent_id", "parent_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    description_format = Column(
        Enum(DescriptionFormat, values_callable=enum_values),
        default=DescriptionFormat.HTML,
        nullable=False,
        server_default="html",
    )
    status = Column(Enum(TaskStatus, values_callable=enum_values), default=TaskStatus.TODO, nullable=False)
    priority = Column(Enum(TaskPriority, values_callable=enum_values), default=TaskPriority.MEDIUM, nullable=False)
    due_date = Column(DateTime(timezone=True), nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    position = Column(Integer, default=0, nullable=False)
    workflow_status = Column(String(30), default="backlog", nullable=False, server_default="backlog")
    is_blocked = Column(Boolean, default=False, nullable=False, server_default="false")
    blocked_reason = Column(Text, nullable=True)
    blocked_by_task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    context = Column(Text, nullable=True)
    expected_result = Column(Text, nullable=True)
    acceptance_criteria = Column(Text, nullable=True)
    next_action = Column(Text, nullable=True)
    estimate_minutes = Column(Integer, nullable=True)
    milestone = Column(String(255), nullable=True)
    sprint = Column(String(255), nullable=True)
    task_type = Column(String(40), nullable=False, default="task", server_default="task")
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    final_due_at = Column(DateTime(timezone=True), nullable=True)
    response_due_at = Column(DateTime(timezone=True), nullable=True)
    next_action_owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    next_action_description = Column(Text, nullable=True)
    next_action_due_at = Column(DateTime(timezone=True), nullable=True)
    waiting_for_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    waiting_for_party = Column(String(20), nullable=False, default="none", server_default="none")
    follow_up_action_description = Column(Text, nullable=True)
    risk_level = Column(String(20), nullable=False, default="low", server_default="low")
    last_activity_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    last_external_communication_at = Column(DateTime(timezone=True), nullable=True)
    communication_channel = Column(String(30), nullable=True)

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

    assignee = relationship("User", back_populates="tasks", foreign_keys=[assignee_id])
    project = relationship("Project", back_populates="tasks")
    comments = relationship("Comment", back_populates="task", cascade="all, delete-orphan")
    parent = relationship("Task", remote_side=[id], back_populates="subtasks", foreign_keys=[parent_id])
    subtasks = relationship("Task", back_populates="parent", foreign_keys=[parent_id])
    blocked_by_task = relationship("Task", remote_side=[id], foreign_keys=[blocked_by_task_id])
    labels = relationship("Label", secondary="task_labels", back_populates="tasks")
    workspace_links = relationship(
        "WorkspaceLink",
        secondary="task_workspace_links",
        back_populates="tasks",
        lazy="selectin",
    )
    manager = relationship("User", foreign_keys=[manager_id])
    next_action_owner = relationship("User", foreign_keys=[next_action_owner_id])
    waiting_for_user = relationship("User", foreign_keys=[waiting_for_user_id])
