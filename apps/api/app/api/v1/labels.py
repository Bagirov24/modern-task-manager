from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from uuid import UUID
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.label import Label
from app.models.task import Task
from app.schemas.label import LabelCreate, LabelUpdate, LabelResponse, LabelAssign

router = APIRouter()


@router.get("/", response_model=List[LabelResponse])
async def list_labels(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Label))
    return result.scalars().all()


@router.post("/", response_model=LabelResponse, status_code=201)
async def create_label(
    data: LabelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    label = Label(**data.model_dump())
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
    result = await db.execute(select(Label).where(Label.id == label_id))
    label = result.scalars().first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
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
    result = await db.execute(select(Label).where(Label.id == label_id))
    label = result.scalars().first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    await db.delete(label)
    await db.commit()


@router.post("/task/{task_id}/assign", status_code=200)
async def assign_labels_to_task(
    task_id: UUID,
    data: LabelAssign,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Task).where(Task.id == task_id))
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
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task.labels
