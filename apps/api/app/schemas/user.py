from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserUpdate(BaseModel):
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None


class UserPublicResponse(BaseModel):
    """
    Safe for multi-user contexts (project members lists, assignee info, etc.).
    Does NOT include email or account metadata.
    """
    id: UUID
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class UserPrivateResponse(UserPublicResponse):
    """
    Full profile — returned only on GET /me.
    Extends UserPublicResponse with fields the owner is allowed to see.
    """
    email: str
    is_active: bool
    created_at: datetime


# Backwards-compat alias so existing imports keep working during migration.
# TODO: replace all usages of UserResponse with the appropriate schema and
#       remove this alias.
UserResponse = UserPrivateResponse


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
