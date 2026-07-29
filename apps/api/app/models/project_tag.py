"""ProjectTag ORM models.

ProjectTag   — a named, coloured label scoped to projects (not tasks).
project_tags — M2M association table between projects and tags.

Design notes
------------
- Tags are owned by a user and can be shared across multiple projects.
- color follows the same #RRGGBB convention as task Labels.
- slug is auto-generated from name (lowercase, spaces→hyphens) and
  used for ?tags= query-param filtering.
- Tags are NOT cascaded on project delete; removing a project does not
  delete the tag, only the association row.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String, Table
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# M2M association table
project_tags_table = Table(
    "project_tags",
    Base.metadata,
    Column(
        "project_id",
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("project_tag_definitions.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class ProjectTag(Base):
    """Tag definition — owned by a user, reusable across projects."""

    __tablename__ = "project_tag_definitions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)
    slug = Column(String(60), nullable=False, index=True)  # for ?tags= filter
    color = Column(String(7), default="#38bdf8")  # #RRGGBB
    owner_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    projects = relationship(
        "Project",
        secondary=project_tags_table,
        back_populates="tags",
    )
