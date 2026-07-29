"""ProjectMember ORM model.

Represents the membership of a user in a project with a specific role.

Roles
-----
  viewer  — read-only access; can see tasks and comments
  editor  — can create/edit/move tasks
  admin   — full control: invite/remove members, rename, delete project

Constraints
-----------
- (project_id, user_id) is UNIQUE — one role per user per project.
- The project owner is NOT stored as a member; ownership is tracked
  via Project.owner_id.  Owner implicitly has admin rights and is
  excluded from membership checks.

Invited-by
----------
- invited_by stores the user_id of whoever added this member;
  used for the activity log (feature #10).
"""
import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base, enum_values


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class MemberRole(str, enum.Enum):
    VIEWER = "viewer"
    EDITOR = "editor"
    ADMIN = "admin"


class ProjectMember(Base):
    __tablename__ = "project_members"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_members"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    role = Column(
        Enum(MemberRole, values_callable=enum_values),
        default=MemberRole.EDITOR,
        nullable=False,
    )
    joined_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)

    project_id = Column(
        UUID(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
    )
    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    invited_by = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    project = relationship("Project", back_populates="members")
    user = relationship("User", foreign_keys=[user_id])
    inviter = relationship("User", foreign_keys=[invited_by])
