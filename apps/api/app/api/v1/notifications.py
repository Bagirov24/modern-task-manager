"""Notifications API endpoints.

Fixes applied
-------------
- Converted from sync ``Session`` to ``AsyncSession`` (was causing
  greenlet / event-loop errors when called from async FastAPI handlers).
- list_notifications: added ``limit`` cap (max 200) to prevent unbounded
  queries.
- mark_all_as_read: uses a single UPDATE statement instead of an ORM loop.
- Inline schemas updated: ``class Config`` replaced with ``model_config``
  dict (Pydantic v2).
"""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Inline schemas  (Pydantic v2 — model_config replaces class Config)
# ---------------------------------------------------------------------------
class NotificationResponse(BaseModel):
    id: UUID
    type: str
    title: str
    message: Optional[str] = None
    is_read: bool
    task_id: Optional[UUID] = None
    project_id: Optional[UUID] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationCreate(BaseModel):
    type: str = "system"
    title: str
    message: Optional[str] = None
    task_id: Optional[UUID] = None
    project_id: Optional[UUID] = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[NotificationResponse])
async def list_notifications(
    unread_only: bool = False,
    # Cap to prevent unbounded queries; default 50, hard max 200.
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    q = select(Notification).where(Notification.user_id == current_user.id)
    if unread_only:
        q = q.where(Notification.is_read.is_(False))
    q = q.order_by(Notification.created_at.desc()).limit(limit)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/unread-count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    return {"count": result.scalar_one()}


@router.post("/", response_model=NotificationResponse, status_code=201)
async def create_notification(
    data: NotificationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = Notification(
        type=data.type,
        title=data.title,
        message=data.message,
        user_id=current_user.id,
        task_id=data.task_id,
        project_id=data.project_id,
    )
    db.add(notification)
    await db.commit()
    await db.refresh(notification)
    return notification


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification


@router.patch("/read-all")
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Single UPDATE statement — no ORM loop, no N+1.
    await db.execute(
        update(Notification)
        .where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"status": "ok"}


@router.delete("/{notification_id}", status_code=204)
async def delete_notification(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    await db.delete(notification)
    await db.commit()
