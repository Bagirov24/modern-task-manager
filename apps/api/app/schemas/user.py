"""User Pydantic schemas.

Security split
--------------
UserPublicResponse   — safe for any authenticated caller (project members,
                       assignee info, comments author, etc.).  Contains only
                       id, username, full_name, avatar_url.

UserPrivateResponse  — returned ONLY on GET /me.  Extends the public schema
                       with email, is_active, created_at.

Validation rules
----------------
- email:    standard EmailStr validation.
- username: 3–100 chars, alphanumeric + underscore only.
- password: 8–128 chars (bcrypt silently truncates beyond 72 bytes; we cap
            at 128 to catch obvious mistakes and prevent DoS via huge inputs).
- full_name: up to 255 chars.
- avatar_url: must be a valid HTTP/HTTPS URL (rejects javascript: URIs).
"""
from __future__ import annotations

import re
from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import AnyHttpUrl, BaseModel, EmailStr, Field, field_validator

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]+$")


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    full_name: Optional[str] = Field(None, max_length=255)

    @field_validator("username", mode="after")
    @classmethod
    def validate_username(cls, v: str) -> str:
        if not _USERNAME_RE.match(v):
            raise ValueError(
                "username may only contain letters, digits, and underscores"
            )
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=100)
    full_name: Optional[str] = Field(None, max_length=255)
    # AnyHttpUrl rejects non-http(s) URIs such as javascript:alert(1)
    avatar_url: Optional[AnyHttpUrl] = None

    @field_validator("username", mode="after")
    @classmethod
    def validate_username(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not _USERNAME_RE.match(v):
            raise ValueError(
                "username may only contain letters, digits, and underscores"
            )
        return v

class PasswordChange(BaseModel):
    current_password: str = Field(..., min_length=8, max_length=128)
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password", mode="after")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return value

class UserPublicResponse(BaseModel):
    """Safe for multi-user contexts (project members, assignee info, etc.).

    Does NOT include email, hashed_password, is_active, or account metadata.
    """

    id: UUID
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class UserPrivateResponse(UserPublicResponse):
    """Full profile — returned ONLY on GET /me.

    Extends UserPublicResponse with fields the owner is allowed to see.
    """

    email: str
    is_active: bool
    created_at: datetime


# Backwards-compat alias — remove once all callers migrated.
UserResponse = UserPrivateResponse


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
