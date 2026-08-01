"""Project member Pydantic schemas.

UX addition (2026-07-29)
------------------------
#ux-3  MemberResponse now includes display_name and avatar_color so
       the frontend can render a rich tooltip
           "Мария Петрова · editor"
       on avatar hover without an extra API call.

       avatar_color is derived deterministically from the user's UUID
       (first 6 hex chars) so it is stable across sessions and servers.
"""
from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field

from app.models.project_member import MemberRole


class MemberInvite(BaseModel):
    user_id: UUID
    role: MemberRole = MemberRole.VIEWER


class MemberRoleUpdate(BaseModel):
    role: MemberRole


class MemberResponse(BaseModel):
    project_id: UUID
    user_id: UUID
    role: MemberRole
    invited_by: UUID

    # #ux-3 — tooltip data (populated from joined User row)
    display_name: str = Field(
        "",
        description="Full name for avatar tooltip: 'Мария Петрова · editor'",
    )
    avatar_color: str = Field(
        "#38bdf8",
        description="Deterministic hex color derived from user_id for avatar bg",
    )
    initials: str = Field(
        "",
        description="2-char initials for avatar fallback, e.g. 'МП'",
    )

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_user(cls, member, user) -> "MemberResponse":
        """Construct from ORM member + joined User row.

        Derives avatar_color from the first 6 hex digits of user.id so
        every user always gets the same colour everywhere in the UI.
        """
        color = "#" + str(user.id).replace("-", "")[:6]
        full_name = getattr(user, "full_name", None) or getattr(user, "username", str(user.id))
        parts = full_name.split()
        initials = "".join(p[0].upper() for p in parts[:2]) if parts else "?"
        return cls(
            project_id=member.project_id,
            user_id=member.user_id,
            role=member.role,
            invited_by=member.invited_by,
            display_name=full_name,
            avatar_color=color,
            initials=initials,
        )
