"""Project Pydantic schemas.

Validation rules
----------------
- name: 1–255 chars, whitespace-stripped, must not be blank.
- color: #RRGGBB hex.
- description: up to 2 000 chars.
- icon: up to 50 chars.
- start_date must be before due_date when both are set.
- initial_tasks: optional list of TaskCreate objects bulk-inserted
  together with the project in one transaction (see create_project).

is_overdue
----------
Computed in Python (not SQL) on the Response model:
  True when due_date is set, has passed, and status is not
  completed/cancelled.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.project import ProjectStatus
from app.schemas.user import UserPublicResponse

if TYPE_CHECKING:
    from app.schemas.task import TaskCreate  # avoid circular at runtime

_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
_CLOSED_STATUSES = {ProjectStatus.COMPLETED, ProjectStatus.CANCELLED}


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
    # Bulk task creation — imported lazily to avoid circular import
    initial_tasks: Optional[List[dict]] = Field(
        default_factory=list,
        description="Optional list of TaskCreate-compatible dicts. "
                    "All tasks are bulk-inserted in the same transaction.",
    )

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
        if self.start_date and self.due_date and self.start_date >= self.due_date:
            raise ValueError("start_date must be before due_date")
        return self


# ---------------------------------------------------------------------------
# Update (all fields optional)
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
        if self.start_date and self.due_date and self.start_date >= self.due_date:
            raise ValueError("start_date must be before due_date")
        return self


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
    start_date: Optional[datetime] = None
    due_date: Optional[datetime] = None
    owner_id: UUID
    owner: Optional[UserPublicResponse] = None
    created_at: datetime
    task_count: Optional[int] = 0

    # Computed: overdue flag — not stored in DB
    is_overdue: bool = False

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_is_overdue(self) -> "ProjectResponse":
        """Mark overdue when due_date is past and project is still open."""
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
