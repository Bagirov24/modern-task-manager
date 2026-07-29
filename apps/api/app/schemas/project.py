"""Project Pydantic schemas.

Validation rules
----------------
- name: 1–255 chars, whitespace-stripped.
- color: must be a valid #RRGGBB hex string.
- description: up to 2 000 chars.
- icon: up to 50 chars.
- ProjectResponse.owner returns UserPublicResponse (safe — no email leak).
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator

from app.schemas.user import UserPublicResponse

_HEX_COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


class ProjectCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2_000)
    color: Optional[str] = Field("#38bdf8", max_length=7)
    icon: Optional[str] = Field(None, max_length=50)

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


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2_000)
    color: Optional[str] = Field(None, max_length=7)
    icon: Optional[str] = Field(None, max_length=50)
    is_archived: Optional[bool] = None

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


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str] = None
    color: str
    icon: Optional[str] = None
    is_archived: bool
    owner_id: UUID
    # Safe public profile — never leaks hashed_password or email to other users.
    owner: Optional[UserPublicResponse] = None
    created_at: datetime
    task_count: Optional[int] = 0

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    projects: List[ProjectResponse]
    total: int
    page: int
    per_page: int
