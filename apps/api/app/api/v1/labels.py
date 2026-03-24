from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.label import (
    LabelCreate,
    LabelUpdate,
    LabelResponse,
    LabelAssign,
)
from app.services.label_service import LabelService

router = APIRouter()


def get_label_service(db: Session = Depends(get_db)) -> LabelService:
    return LabelService(db)


@router.get("/", response_model=List[LabelResponse])
async def list_labels(
    current_user: User = Depends(get_current_user),
    service: LabelService = Depends(get_label_service),
):
    return service.get_all_labels()


@router.post("/", response_model=LabelResponse, status_code=201)
async def create_label(
    data: LabelCreate,
    current_user: User = Depends(get_current_user),
    service: LabelService = Depends(get_label_service),
):
    return service.create_label(data)


@router.patch("/{label_id}", response_model=LabelResponse)
async def update_label(
    label_id: UUID,
    data: LabelUpdate,
    current_user: User = Depends(get_current_user),
    service: LabelService = Depends(get_label_service),
):
    label = service.update_label(label_id, data)
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    return label


@router.delete("/{label_id}", status_code=204)
async def delete_label(
    label_id: UUID,
    current_user: User = Depends(get_current_user),
    service: LabelService = Depends(get_label_service),
):
    if not service.delete_label(label_id):
        raise HTTPException(status_code=404, detail="Label not found")


@router.post("/task/{task_id}/assign", status_code=200)
async def assign_labels_to_task(
    task_id: UUID,
    data: LabelAssign,
    current_user: User = Depends(get_current_user),
    service: LabelService = Depends(get_label_service),
):
    service.assign_labels_to_task(task_id, data.label_ids)
    return {"status": "ok"}


@router.get("/task/{task_id}", response_model=List[LabelResponse])
async def get_task_labels(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    service: LabelService = Depends(get_label_service),
):
    return service.get_labels_for_task(task_id)
