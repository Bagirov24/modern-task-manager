"""Shared project access checks for documents and Test Data Vault."""
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.project import Project
from app.models.project_member import MemberRole, ProjectMember


async def accessible_project_ids(db: AsyncSession, user_id: UUID) -> list[UUID]:
    result = await db.execute(
        select(Project.id)
        .outerjoin(ProjectMember, ProjectMember.project_id == Project.id)
        .where(or_(Project.owner_id == user_id, ProjectMember.user_id == user_id))
    )
    return list(dict.fromkeys(result.scalars().all()))


async def require_project_access(
    db: AsyncSession,
    project_id: UUID | None,
    user_id: UUID,
    *,
    write: bool = False,
) -> None:
    if project_id is None:
        return
    result = await db.execute(
        select(Project.owner_id, ProjectMember.role)
        .outerjoin(
            ProjectMember,
            (ProjectMember.project_id == Project.id) & (ProjectMember.user_id == user_id),
        )
        .where(Project.id == project_id)
    )
    row = result.first()
    if not row or (row.owner_id != user_id and row.role is None):
        raise HTTPException(status_code=404, detail="Project not found")
    if write and row.owner_id != user_id and row.role == MemberRole.VIEWER:
        raise HTTPException(status_code=403, detail="Editor access required")


async def project_capability(db: AsyncSession, project_id: UUID | None, user_id: UUID) -> str:
    if project_id is None:
        return "project_admin"
    result = await db.execute(
        select(Project.owner_id, ProjectMember.role)
        .outerjoin(
            ProjectMember,
            (ProjectMember.project_id == Project.id) & (ProjectMember.user_id == user_id),
        )
        .where(Project.id == project_id)
    )
    row = result.first()
    if not row:
        return "none"
    if row.owner_id == user_id or row.role == MemberRole.ADMIN:
        return "project_admin"
    if row.role == MemberRole.EDITOR:
        return "developer"
    if row.role == MemberRole.VIEWER:
        return "viewer"
    return "none"
