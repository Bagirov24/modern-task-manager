"""ProjectActivity ORM model — append-only audit log.

Every write operation on a project (create, update, archive, delete,
member changes) appends a row here via the _log() helper in the router.

action values
-------------
  project_created      meta: {name}
  project_updated      meta: {changed_fields: [...]}
  project_archived     meta: {}
  project_deleted      meta: {name}  (logged before deletion)
  member_invited       meta: {user_id, role}
  member_removed       meta: {user_id}
  member_role_changed  meta: {user_id, old_role, new_role}
  readme_updated       meta: {format}
  tag_added            meta: {tag_id, tag_name}
  tag_removed          meta: {tag_id, tag_name}

The meta column is JSONB so arbitrary context can be stored without
schema migrations.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, String
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProjectActivity(Base):
    __tablename__ = "project_activity"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    action = Column(String(60), nullable=False, index=True)
    meta = Column(JSONB, default=dict, nullable=False)
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    user = relationship("User")
