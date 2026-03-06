from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.label import Label

router = APIRouter()


class LabelCreate(BaseModel):
    name: str
    color: Optional[str] = "#38bdf8"


class LabelResponse(BaseModel):
    id: UUID
    name: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/", response_model=List[LabelResponse])
async def list_labels(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Label).all()


@router.post("/", response_model=LabelResponse, status_code=201)
async def create_label(
    data: LabelCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    label = Label(name=data.name, color=data.color)
    db.add(label)
    db.commit()
    db.refresh(label)
    return label


@router.delete("/{label_id}", status_code=204)
async def delete_label(
    label_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    label = db.query(Label).filter(Label.id == label_id).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")
    db.delete(label)
    db.commit()
