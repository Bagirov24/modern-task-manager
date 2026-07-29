import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    """Return current timezone-aware UTC datetime.

    Replaces the deprecated ``datetime.utcnow()`` which returns a naive
    datetime without tzinfo, causing incorrect comparisons with
    timezone-aware values stored in PostgreSQL ``TIMESTAMPTZ`` columns.
    """
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(String(500))
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    # DateTime(timezone=True) stores as TIMESTAMPTZ in PostgreSQL.
    # _utcnow callable (not _utcnow()) so SQLAlchemy calls it per-row.
    created_at = Column(DateTime(timezone=True), default=_utcnow, nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        default=_utcnow,
        onupdate=_utcnow,
        nullable=False,
    )

    tasks = relationship("Task", back_populates="assignee")
    projects = relationship("Project", back_populates="owner")
    comments = relationship("Comment", back_populates="author")
