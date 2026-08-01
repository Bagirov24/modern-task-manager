"""Safe test-data catalog. Secret values are deliberately not modelled."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, ForeignKey, Index, JSON, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class TestDataSet(Base):
    __tablename__ = "test_data_sets"
    __table_args__ = (
        Index("ix_test_data_sets_workspace_id", "workspace_id"),
        Index("ix_test_data_sets_project_id", "project_id"),
        Index("ix_test_data_sets_owner_id", "owner_id"),
    )
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    name = Column(String(500), nullable=False)
    category = Column(String(30), nullable=False)
    environment = Column(String(30), nullable=False)
    sensitivity = Column(String(30), nullable=False, default="internal")
    description = Column(Text, nullable=True)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    last_verified_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)
    items = relationship("TestDataItem", back_populates="data_set", cascade="all, delete-orphan")


class TestDataItem(Base):
    __tablename__ = "test_data_items"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    test_data_set_id = Column(UUID(as_uuid=True), ForeignKey("test_data_sets.id", ondelete="CASCADE"), nullable=False, index=True)
    label = Column(String(500), nullable=False)
    item_type = Column(String(30), nullable=False)
    display_value = Column(Text, nullable=True)
    vault_provider = Column(String(100), nullable=True)
    vault_reference = Column(String(1000), nullable=True)
    metadata_json = Column(JSON, nullable=False, default=dict)
    rotation_due_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)
    data_set = relationship("TestDataSet", back_populates="items")
    access_logs = relationship("TestDataAccessLog", back_populates="item", cascade="all, delete-orphan")


class TestDataAccessLog(Base):
    __tablename__ = "test_data_access_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    test_data_item_id = Column(UUID(as_uuid=True), ForeignKey("test_data_items.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    action = Column(String(50), nullable=False)
    ip_address = Column(String(64), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    item = relationship("TestDataItem", back_populates="access_logs")
