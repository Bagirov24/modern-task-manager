from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.sensitive_data import ensure_safe_text

DocumentType = Literal[
    "brief", "product-requirements", "technical-specification", "architecture",
    "api-documentation", "decision-record", "test-plan", "runbook",
    "release-note", "retrospective", "meeting-notes", "contract", "integration-guide",
]
DocumentStatus = Literal["draft", "published", "archived"]
ConfidentialityLevel = Literal["public", "internal", "confidential", "restricted"]


class DocumentLinkCreate(BaseModel):
    link_type: str = Field("related", max_length=40)
    title: str = Field(..., min_length=1, max_length=500)
    url: str = Field(..., min_length=1, max_length=4000)
    metadata_json: dict = Field(default_factory=dict)

    @model_validator(mode="after")
    def reject_sensitive_text(self):
        ensure_safe_text(self.title)
        ensure_safe_text(self.url)
        return self


class DocumentLinkResponse(DocumentLinkCreate):
    id: UUID
    document_id: UUID
    model_config = {"from_attributes": True}


class DocumentAttachmentResponse(BaseModel):
    id: UUID
    document_id: UUID
    original_name: str
    mime_type: str
    size_bytes: int
    checksum: str
    created_at: datetime
    download_url: str | None = None
    model_config = {"from_attributes": True}


class DocumentCreate(BaseModel):
    workspace_id: UUID | None = None
    project_id: UUID | None = None
    task_id: UUID | None = None
    parent_document_id: UUID | None = None
    title: str = Field(..., min_length=1, max_length=500)
    slug: str | None = Field(None, max_length=550)
    content_markdown: str = Field("", max_length=500_000)
    document_type: DocumentType = "brief"
    status: DocumentStatus = "draft"
    is_template: bool = False
    confidentiality_level: ConfidentialityLevel = "internal"
    source_communication_id: UUID | None = None

    @model_validator(mode="after")
    def reject_sensitive_text(self):
        ensure_safe_text(self.title)
        ensure_safe_text(self.content_markdown)
        return self


class DocumentUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    content_markdown: str | None = Field(None, max_length=500_000)
    document_type: DocumentType | None = None
    status: DocumentStatus | None = None
    project_id: UUID | None = None
    task_id: UUID | None = None
    parent_document_id: UUID | None = None
    change_summary: str | None = Field(None, max_length=500)
    expected_version: int | None = Field(None, ge=1)
    confidentiality_level: ConfidentialityLevel | None = None
    source_communication_id: UUID | None = None

    @model_validator(mode="after")
    def reject_sensitive_text(self):
        ensure_safe_text(self.title)
        ensure_safe_text(self.content_markdown)
        ensure_safe_text(self.change_summary)
        return self


class DocumentVersionResponse(BaseModel):
    id: UUID
    document_id: UUID
    version: int
    content_markdown: str
    changed_by: UUID
    change_summary: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class DocumentResponse(BaseModel):
    id: UUID
    workspace_id: UUID | None
    project_id: UUID | None
    task_id: UUID | None
    parent_document_id: UUID | None
    title: str
    slug: str
    content_markdown: str
    document_type: str
    status: str
    owner_id: UUID
    version: int
    is_template: bool
    created_at: datetime
    updated_at: datetime
    archived_at: datetime | None
    confidentiality_level: str = "internal"
    source_communication_id: UUID | None = None
    links: list[DocumentLinkResponse] = Field(default_factory=list)
    attachments: list[DocumentAttachmentResponse] = Field(default_factory=list)
    model_config = {"from_attributes": True}


class DocumentListResponse(BaseModel):
    documents: list[DocumentResponse]
    total: int
    page: int
    per_page: int


class DocumentRestoreRequest(BaseModel):
    change_summary: str | None = Field("Restored an earlier version", max_length=500)

    @field_validator("change_summary")
    @classmethod
    def reject_sensitive_summary(cls, value):
        return ensure_safe_text(value)
