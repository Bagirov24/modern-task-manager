"""Action Inbox item representing selected communication that needs action."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class CommunicationItem(Base):
    __tablename__ = "communication_items"
    __table_args__ = (
        UniqueConstraint("source_type", "source_message_id", name="uq_communication_source_message"),
        Index("ix_communication_items_project_id", "project_id"),
        Index("ix_communication_items_task_id", "task_id"),
        Index("ix_communication_items_action_owner_id", "action_owner_id"),
        Index("ix_communication_items_action_status", "action_status"),
        Index("ix_communication_items_response_due_at", "response_due_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True)
    parent_communication_id = Column(UUID(as_uuid=True), ForeignKey("communication_items.id", ondelete="SET NULL"), nullable=True)
    source_type = Column(String(20), nullable=False, default="manual")
    source_message_id = Column(String(255), nullable=True)
    source_thread_id = Column(String(255), nullable=True)
    sender_name = Column(String(255), nullable=False)
    sender_role = Column(String(30), nullable=False, default="other")
    direction = Column(String(20), nullable=False, default="incoming")
    subject = Column(String(500), nullable=True)
    body_preview = Column(Text, nullable=False)
    source_url = Column(Text, nullable=True)
    received_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    action_status = Column(String(30), nullable=False, default="new")
    action_owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    response_due_at = Column(DateTime(timezone=True), nullable=True)
    waiting_for_user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    waiting_for_party = Column(String(20), nullable=False, default="none")
    next_action = Column(Text, nullable=True)
    needs_reply = Column(Boolean, nullable=False, default=False)
    importance = Column(String(20), nullable=False, default="normal")
    ai_summary = Column(Text, nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    project = relationship("Project")
    task = relationship("Task")
    parent = relationship("CommunicationItem", remote_side=[id])
    action_owner = relationship("User", foreign_keys=[action_owner_id])
    waiting_for_user = relationship("User", foreign_keys=[waiting_for_user_id])
