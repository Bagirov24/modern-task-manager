"""Project ORM models — final version with all 10 features.

New fields in this commit
-------------------------
#6  readme          Text        — rich-text wiki (Tiptap HTML)
    readme_format   ENUM        — plain | markdown | html
#8  is_pinned       BOOLEAN     — pinned projects float to the top
    position        INTEGER     — manual sort order (drag-and-drop)
#9  tags            M2M rel     — via project_tags association table
#10 activity        O2M rel     — append-only ProjectActivity rows
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProjectStatus(str, enum.Enum):
    PLANNING = "planning"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ReadmeFormat(str, enum.Enum):
    PLAIN = "plain"
    MARKDOWN = "markdown"
    HTML = "html"


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)          # short description (2 000 chars)
    color = Column(String(7), default="#38bdf8")
    icon = Column(String(50))

    # #6 — README / Wiki
    readme = Column(Text, nullable=True)
    readme_format = Column(
        Enum(ReadmeFormat),
        default=ReadmeFormat.HTML,
        nullable=False,
        server_default="html",
    )

    # Lifecycle
    status = Column(
        Enum(ProjectStatus),
        default=ProjectStatus.ACTIVE,
        nullable=False,
        server_default="active",
    )
    is_archived = Column(Boolean, default=False, nullable=False)

    # #8 — pinned + manual order
    is_pinned = Column(Boolean, default=False, nullable=False, server_default="false")
    position = Column(Integer, default=0, nullable=False, server_default="0")

    # Dates
    start_date = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)

    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )

    # Relationships
    owner = relationship("User", back_populates="projects")
    tasks = relationship("Task", back_populates="project", cascade="all, delete-orphan")
    sections = relationship("Section", back_populates="project", cascade="all, delete-orphan")
    members = relationship("ProjectMember", back_populates="project", cascade="all, delete-orphan")

    # #9 — tags M2M
    tags = relationship(
        "ProjectTag",
        secondary="project_tags",
        back_populates="projects",
        lazy="selectin",
    )

    # #10 — activity log
    activity = relationship(
        "ProjectActivity",
        back_populates=None,
        cascade="all, delete-orphan",
        order_by="ProjectActivity.created_at.desc()",
    )


class Section(Base):
    __tablename__ = "sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    position = Column(Integer, default=0, nullable=False)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    project = relationship("Project", back_populates="sections")
