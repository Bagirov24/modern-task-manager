"""Project ORM models (updated: members relationship added)."""
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


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#38bdf8")
    icon = Column(String(50))

    # Lifecycle
    status = Column(
        Enum(ProjectStatus),
        default=ProjectStatus.ACTIVE,
        nullable=False,
        server_default="active",
    )
    is_archived = Column(Boolean, default=False, nullable=False)

    # Dates
    start_date = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)

    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow, nullable=False,
    )

    owner = relationship("User", back_populates="projects")
    tasks = relationship(
        "Task", back_populates="project", cascade="all, delete-orphan"
    )
    sections = relationship(
        "Section", back_populates="project", cascade="all, delete-orphan"
    )
    members = relationship(
        "ProjectMember",
        back_populates="project",
        cascade="all, delete-orphan",
    )


class Section(Base):
    __tablename__ = "sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    position = Column(Integer, default=0, nullable=False)
    project_id = Column(
        UUID(as_uuid=True), ForeignKey("projects.id"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    project = relationship("Project", back_populates="sections")
