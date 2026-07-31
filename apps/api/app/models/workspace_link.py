"""Useful workspace links and optional task associations."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, JSON, String, Table, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


task_workspace_links = Table(
    "task_workspace_links",
    Base.metadata,
    Column("task_id", UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
    Column("workspace_link_id", UUID(as_uuid=True), ForeignKey("workspace_links.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", DateTime(timezone=True), nullable=False, default=_utcnow),
)


class WorkspaceLink(Base):
    __tablename__ = "workspace_links"
    __table_args__ = (
        Index("ix_workspace_links_workspace_id", "workspace_id"),
        Index("ix_workspace_links_project_id", "project_id"),
        Index("ix_workspace_links_category", "category"),
        Index("ix_workspace_links_is_favorite", "is_favorite"),
        Index("ix_workspace_links_created_by", "created_by"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    url = Column(Text, nullable=False)
    category = Column(String(30), nullable=False)
    environment = Column(String(50), nullable=True)
    login = Column(String(255), nullable=True)
    access_status = Column(String(30), nullable=False, default="has_access")
    access_hint = Column(String(500), nullable=True)
    notes = Column(Text, nullable=True)
    tags = Column(JSON, nullable=False, default=list)
    is_favorite = Column(Boolean, nullable=False, default=False, server_default="false")
    sort_order = Column(Integer, nullable=False, default=0, server_default="0")
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)

    project = relationship("Project")
    tasks = relationship("Task", secondary=task_workspace_links, back_populates="workspace_links")

    @property
    def project_name(self) -> str | None:
        return self.project.name if self.project else None
