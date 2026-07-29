"""Project tags (categories) CRUD + attach/detach endpoints.

GET    /project-tags/                    — list tags owned by user
POST   /project-tags/                    — create tag
DELETE /project-tags/{tag_id}            — delete tag (owner only)
POST   /projects/{project_id}/tags/{tag_id}    — attach tag to project
DELETE /projects/{project_id}/tags/{tag_id}    — detach tag from project

Filtering via ?tags= in GET /projects/ is handled in projects.py.
"""
from __future__ import annotations

import re
from typing import List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project
from app.models.project_tag import ProjectTag
from app.models.user import User
from app.schemas.project import TagResponse

router = APIRouter()

_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _to_slug(name: str) -> str:
    return _SLUG_RE.sub("-", name.lower().strip()).strip("-")[:60]


class TagCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: str = "#38bdf8"

    @field_validator("color")
    @classmethod
    def check_color(cls, v: str) -> str:
        if not _HEX_RE.match(v):
            raise ValueError("color must be #RRGGBB")
        return v


# ---------------------------------------------------------------------------
# Tag CRUD
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[TagResponse])
async def list_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectTag).where(ProjectTag.owner_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=TagResponse, status_code=201)
async def create_tag(
    body: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tag = ProjectTag(
        id=uuid4(),
        name=body.name,
        slug=_to_slug(body.name),
        color=body.color,
        owner_id=current_user.id,
    )
    db.add(tag)
    await db.commit()
    await db.refresh(tag)
    return tag


@router.delete("/{tag_id}", status_code=204)
async def delete_tag(
    tag_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectTag).where(
            ProjectTag.id == tag_id,
            ProjectTag.owner_id == current_user.id,
        )
    )
    tag = result.scalars().first()
    if not tag:
        raise HTTPException(404, "Tag not found")
    await db.delete(tag)
    await db.commit()


# ---------------------------------------------------------------------------
# Attach / detach  (nested under /projects/{project_id}/tags/)
# ---------------------------------------------------------------------------

async def _get_project_with_tags(project_id: UUID, user_id: UUID, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project)
        .options(selectinload(Project.tags))
        .where(Project.id == project_id, Project.owner_id == user_id)
    )
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Project not found")
    return p


@router.post("/projects/{project_id}/tags/{tag_id}", response_model=List[TagResponse])
async def attach_tag(
    project_id: UUID,
    tag_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_tags(project_id, current_user.id, db)
    tag_result = await db.execute(
        select(ProjectTag).where(
            ProjectTag.id == tag_id,
            ProjectTag.owner_id == current_user.id,
        )
    )
    tag = tag_result.scalars().first()
    if not tag:
        raise HTTPException(404, "Tag not found")
    if tag not in project.tags:
        project.tags.append(tag)
        await db.commit()
    return project.tags


@router.delete("/projects/{project_id}/tags/{tag_id}", status_code=204)
async def detach_tag(
    project_id: UUID,
    tag_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_project_with_tags(project_id, current_user.id, db)
    project.tags = [t for t in project.tags if t.id != tag_id]
    await db.commit()
