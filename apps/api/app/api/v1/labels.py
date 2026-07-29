"""Labels API endpoints.

Fixes applied
-------------
- list_labels: was returning ALL labels globally; now scoped to
  ``current_user.id`` (owner).
- create_label: stores ``owner_id=current_user.id``.
- update_label / delete_label: ownership check — returns 404 on
  not-owned labels (avoids leaking existence).
- assign_labels_to_task: verifies task ownership before mutating the
  ``task.labels`` relation.
- Color validation: #RRGGBB hex guard (mirrors project schema validator).
- All endpoints use AsyncSession (was already async, kept consistent).

Note: Label.owner_id column requires a new Alembic migration.
Run: alembic revision --autogenerate -m 'add label owner_id'
"""
from __future__ import annotations

import re
from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.label import Label
from app.models.task import Task
from app.models.user import User
from app.schemas.label import LabelAssign, LabelCreate, LabelResponse, LabelUpdate

router = APIRouter()

_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


async def _get_owned_label(label_id: UUID, user_id, db: AsyncSession) -> Label:
    """Fetch label owned by user; 404 on miss or wrong owner."""
    result = await db.execute(
        select(Label).where(
            Label.id == label_id,
            Label.owner_id == user_id,
        )
    )
    label = result.scalars().first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    return label


@router.get("/", response_model=List[LabelResponse])
async def list_labels(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Scoped to current user — was previously returning ALL labels.
    result = await db.execute(
        select(Label).where(Label.owner_id == current_user.id)
    )
    return result.scalars().all()


@router.post("/", response_model=LabelResponse, status_code=201)
async def create_label(
    data: LabelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.color and not _HEX_RE.match(data.color):
        raise HTTPException(
            status_code=422, detail="color must be a valid #RRGGBB hex string"
        )
    label = Label(**data.model_dump(), owner_id=current_user.id)
    db.add(label)
    await db.commit()
    await db.refresh(label)
    return label


@router.patch("/{label_id}", response_model=LabelResponse)
async def update_label(
    label_id: UUID,
    data: LabelUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    label = await _get_owned_label(label_id, current_user.id, db)
    if data.color and not _HEX_RE.match(data.color):
        raise HTTPException(
            status_code=422, detail="color must be a valid #RRGGBB hex string"
        )
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(label, field, value)
    await db.commit()
    await db.refresh(label)
    return label


@router.delete("/{label_id}", status_code=204)
async def delete_label(
    label_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    label = await _get_owned_label(label_id, current_user.id, db)
    await db.delete(label)
    await db.commit()


@router.post("/task/{task_id}/assign", status_code=200)
async def assign_labels_to_task(
    task_id: UUID,
    data: LabelAssign,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Enforce task ownership before touching labels relation.
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.assignee_id == current_user.id,
        )
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    labels_result = await db.execute(
        select(Label).where(Label.id.in_(data.label_ids))
    )
    task.labels = labels_result.scalars().all()
    await db.commit()
    return {"status": "ok", "assigned": len(task.labels)}


@router.get("/task/{task_id}", response_model=List[LabelResponse])
async def get_task_labels(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.assignee_id == current_user.id,
        )
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.labels
