from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, Field, field_validator, model_validator

from app.core.sensitive_data import ensure_safe_text

Category = Literal[
    "development", "logs", "monitoring", "communication", "documentation",
    "testing", "design", "infrastructure", "analytics", "other",
]
AccessStatus = Literal["has_access", "request_access", "no_access"]


class WorkspaceLinkCreate(BaseModel):
    workspace_id: UUID | None = None
    project_id: UUID | None = None
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1, max_length=2000)
    url: AnyHttpUrl
    category: Category
    environment: str | None = Field(None, max_length=50)
    login: str | None = Field(None, max_length=255)
    access_status: AccessStatus = "has_access"
    access_hint: str | None = Field(None, max_length=500)
    notes: str | None = Field(None, max_length=5000)
    tags: list[str] = Field(default_factory=list, max_length=20)
    is_favorite: bool = False
    sort_order: int = Field(0, ge=0, le=1_000_000)

    @field_validator("title", "description", "environment", "login", "access_hint", "notes")
    @classmethod
    def reject_sensitive_text(cls, value: str | None) -> str | None:
        return ensure_safe_text(value.strip() if value else value)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, values: list[str]) -> list[str]:
        result = []
        for value in values:
            cleaned = value.strip()[:50]
            if cleaned and cleaned not in result:
                result.append(ensure_safe_text(cleaned))
        return result

    @model_validator(mode="after")
    def reject_secret_in_url(self):
        ensure_safe_text(str(self.url))
        return self


class WorkspaceLinkUpdate(BaseModel):
    project_id: UUID | None = None
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = Field(None, min_length=1, max_length=2000)
    url: AnyHttpUrl | None = None
    category: Category | None = None
    environment: str | None = Field(None, max_length=50)
    login: str | None = Field(None, max_length=255)
    access_status: AccessStatus | None = None
    access_hint: str | None = Field(None, max_length=500)
    notes: str | None = Field(None, max_length=5000)
    tags: list[str] | None = Field(None, max_length=20)
    is_favorite: bool | None = None
    sort_order: int | None = Field(None, ge=0, le=1_000_000)

    @field_validator("title", "description", "environment", "login", "access_hint", "notes")
    @classmethod
    def reject_sensitive_text(cls, value: str | None) -> str | None:
        return ensure_safe_text(value.strip() if value else value)

    @field_validator("tags")
    @classmethod
    def validate_tags(cls, values: list[str] | None) -> list[str] | None:
        return WorkspaceLinkCreate.validate_tags(values) if values is not None else None

    @model_validator(mode="after")
    def reject_secret_in_url(self):
        if self.url:
            ensure_safe_text(str(self.url))
        return self


class WorkspaceLinkResponse(BaseModel):
    id: UUID
    workspace_id: UUID | None
    project_id: UUID | None
    project_name: str | None = None
    title: str
    description: str
    url: str
    category: str
    environment: str | None
    login: str | None
    access_status: str
    access_hint: str | None
    notes: str | None
    tags: list[str] = Field(default_factory=list)
    is_favorite: bool
    sort_order: int
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class WorkspaceLinkListResponse(BaseModel):
    links: list[WorkspaceLinkResponse]
    total: int
    page: int
    per_page: int
