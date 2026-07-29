"""Project template ORM models.

A ProjectTemplate is a reusable blueprint that pre-populates a new
project with sections and tasks when POST /projects/from-template/
is called.

Built-in templates
------------------
Four built-in templates ship with the app (seeded on first startup):

  1. «Scrum Sprint»      — Backlog, In Progress, Review, Done
  2. «Запуск продукта»   — Research, Design, Development, QA, Launch
  3. «Маркетинговая кампания» — Planning, Content, Distribution, Analytics
  4. «Личные задачи»     — Today, This Week, Someday

Custom templates
----------------
Users can create their own templates via POST /project-templates/.
They are visible only to their owner (is_public=False) unless
explicitly shared (is_public=True).

TemplateTask.relative_days
--------------------------
When a project is created from a template, each task's due_date is
computed as: project.start_date + timedelta(days=relative_days)
if start_date is provided; otherwise due_date is left NULL.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String, Text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProjectTemplate(Base):
    __tablename__ = "project_templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    icon = Column(String(50), default="📋")
    color = Column(String(7), default="#38bdf8")
    is_public = Column(Boolean, default=False, nullable=False)

    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,  # NULL = built-in system template
    )

    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    sections = relationship(
        "TemplateSection",
        back_populates="template",
        cascade="all, delete-orphan",
        order_by="TemplateSection.position",
    )
    owner = relationship("User")


class TemplateSection(Base):
    __tablename__ = "template_sections"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    position = Column(Integer, default=0, nullable=False)
    template_id = Column(
        UUID(as_uuid=True),
        ForeignKey("project_templates.id", ondelete="CASCADE"),
        nullable=False,
    )

    template = relationship("ProjectTemplate", back_populates="sections")
    tasks = relationship(
        "TemplateTask",
        back_populates="section",
        cascade="all, delete-orphan",
        order_by="TemplateTask.position",
    )


class TemplateTask(Base):
    __tablename__ = "template_tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    priority = Column(String(20), default="medium")  # low|medium|high|urgent
    position = Column(Integer, default=0, nullable=False)
    # Days offset from project start_date; NULL = no due date
    relative_days = Column(Integer, nullable=True)

    section_id = Column(
        UUID(as_uuid=True),
        ForeignKey("template_sections.id", ondelete="CASCADE"),
        nullable=False,
    )

    section = relationship("TemplateSection", back_populates="tasks")
