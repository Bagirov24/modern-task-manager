"""Project Pydantic schemas — final version (all 10 features)."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.project import ProjectStatus, ReadmeFormat
from app.core.sensitive_data import ensure_safe_text
from app.schemas.user import UserPublicResponse

_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
_CLOSED_STATUSES = {ProjectStatus.COMPLETED, ProjectStatus.CANCELLED}


# ---------------------------------------------------------------------------
# Tag schema (inline — small)
# ---------------------------------------------------------------------------
class TagResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    color: str
    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------
class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2_000)
    color: Optional[str] = Field("#38bdf8", max_length=7)
    icon: Optional[str] = Field(None, max_length=50)
    status: ProjectStatus = ProjectStatus.ACTIVE
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    readme: Optional[str] = None                          # #6
    readme_format: ReadmeFormat = ReadmeFormat.HTML       # #6
    initial_tasks: Optional[List[dict]] = Field(default_factory=list)

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped

    @field_validator("color", mode="after")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _HEX_COLOR_RE.match(v):
            raise ValueError("color must be a valid #RRGGBB hex string")
        return v

    @model_validator(mode="after")
    def check_dates(self) -> "ProjectCreate":
        for value in (self.name, self.description, self.readme):
            ensure_safe_text(value)
        if self.start_date and self.due_date and self.start_date >= self.due_date:
            raise ValueError("start_date must be before due_date")
        return self


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------
class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2_000)
    color: Optional[str] = Field(None, max_length=7)
    icon: Optional[str] = Field(None, max_length=50)
    status: Optional[ProjectStatus] = None
    is_archived: Optional[bool] = None
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    readme: Optional[str] = None                          # #6
    readme_format: Optional[ReadmeFormat] = None          # #6
    is_pinned: Optional[bool] = None                      # #8
    position: Optional[int] = Field(None, ge=0)           # #8

    @field_validator("name", mode="before")
    @classmethod
    def strip_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            raise ValueError("name must not be blank")
        return stripped

    @field_validator("color", mode="after")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _HEX_COLOR_RE.match(v):
            raise ValueError("color must be a valid #RRGGBB hex string")
        return v

    @model_validator(mode="after")
    def check_dates(self) -> "ProjectUpdate":
        for value in (self.name, self.description, self.readme):
            ensure_safe_text(value)
        if self.start_date and self.due_date and self.start_date >= self.due_date:
            raise ValueError("start_date must be before due_date")
        return self


# ---------------------------------------------------------------------------
# README update (dedicated body — not via PATCH to keep it atomic)
# ---------------------------------------------------------------------------
class ReadmeUpdate(BaseModel):
    readme: str = Field(..., max_length=50_000)   # 50k chars for wiki
    readme_format: ReadmeFormat = ReadmeFormat.HTML

    @field_validator("readme")
    @classmethod
    def reject_sensitive_text(cls, value: str) -> str:
        return ensure_safe_text(value)


# ---------------------------------------------------------------------------
# Reorder body
# ---------------------------------------------------------------------------
class ProjectReorder(BaseModel):
    position: int = Field(..., ge=0)


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------
class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    color: str
    icon: Optional[str] = None
    status: ProjectStatus = ProjectStatus.ACTIVE
    is_archived: bool
    is_pinned: bool = False                               # #8
    position: int = 0                                     # #8
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    readme: Optional[str] = None                          # #6
    readme_format: ReadmeFormat = ReadmeFormat.HTML       # #6
    owner_id: UUID
    owner: Optional[UserPublicResponse] = None
    tags: List[TagResponse] = []                          # #9
    created_at: datetime
    task_count: Optional[int] = 0
    is_overdue: bool = False                              # computed

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_is_overdue(self) -> "ProjectResponse":
        if (
            self.due_date
            and self.due_date < datetime.now(timezone.utc)
            and self.status not in _CLOSED_STATUSES
        ):
            self.is_overdue = True
        return self


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
    page: int
    per_page: int
