"""ProjectMember Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from uuid import UUID
from typing import Optional

from pydantic import BaseModel

from app.models.project_member import MemberRole
from app.schemas.user import UserPublicResponse


class MemberInvite(BaseModel):
    """Body for POST /{project_id}/members."""
    user_id: UUID
    role: MemberRole = MemberRole.EDITOR


class MemberRoleUpdate(BaseModel):
    """Body for PATCH /{project_id}/members/{user_id}."""
    role: MemberRole


class MemberResponse(BaseModel):
    id: UUID
    project_id: UUID
    user_id: UUID
    role: MemberRole
    joined_at: datetime
    invited_by: Optional[UUID] = None
    user: Optional[UserPublicResponse] = None

    model_config = {"from_attributes": True}
