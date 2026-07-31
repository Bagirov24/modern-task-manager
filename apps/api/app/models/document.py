"""Structured documents, links, attachments, permissions and versions."""
import uuid
from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, Column, DateTime, ForeignKey, Index, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.core.database import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Document(Base):
    __tablename__ = "documents"
    __table_args__ = (
        Index("ix_documents_workspace_id", "workspace_id"),
        Index("ix_documents_project_id", "project_id"),
        Index("ix_documents_task_id", "task_id"),
        Index("ix_documents_owner_id", "owner_id"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True)
    parent_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(500), nullable=False)
    slug = Column(String(550), nullable=False)
    content_markdown = Column(Text, nullable=False, default="")
    document_type = Column(String(50), nullable=False, default="brief")
    status = Column(String(30), nullable=False, default="draft")
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    is_template = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    updated_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow, onupdate=_utcnow)
    archived_at = Column(DateTime(timezone=True), nullable=True)
    confidentiality_level = Column(String(30), nullable=False, default="internal", server_default="internal")
    source_communication_id = Column(UUID(as_uuid=True), ForeignKey("communication_items.id", ondelete="SET NULL"), nullable=True)

    links = relationship("DocumentLink", back_populates="document", cascade="all, delete-orphan")
    attachments = relationship("DocumentAttachment", back_populates="document", cascade="all, delete-orphan")
    versions = relationship("DocumentVersion", back_populates="document", cascade="all, delete-orphan")
    permissions = relationship("DocumentPermission", back_populates="document", cascade="all, delete-orphan")


class DocumentLink(Base):
    __tablename__ = "document_links"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    link_type = Column(String(40), nullable=False, default="related")
    title = Column(String(500), nullable=False)
    url = Column(Text, nullable=False)
    metadata_json = Column(JSON, nullable=False, default=dict)
    document = relationship("Document", back_populates="links")


class DocumentAttachment(Base):
    __tablename__ = "document_attachments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    storage_key = Column(String(1000), nullable=False, unique=True)
    original_name = Column(String(500), nullable=False)
    mime_type = Column(String(255), nullable=False)
    size_bytes = Column(BigInteger, nullable=False)
    checksum = Column(String(128), nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    document = relationship("Document", back_populates="attachments")


class DocumentPermission(Base):
    __tablename__ = "document_permissions"
    __table_args__ = (UniqueConstraint("document_id", "subject_type", "subject_id", name="uq_document_permission_subject"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    subject_type = Column(String(30), nullable=False)
    subject_id = Column(UUID(as_uuid=True), nullable=False)
    permission = Column(String(20), nullable=False, default="view")
    document = relationship("Document", back_populates="permissions")


class DocumentVersion(Base):
    __tablename__ = "document_versions"
    __table_args__ = (UniqueConstraint("document_id", "version", name="uq_document_version"),)
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, nullable=False)
    content_markdown = Column(Text, nullable=False)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    change_summary = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    document = relationship("Document", back_populates="versions")
