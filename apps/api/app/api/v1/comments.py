from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.comment import Comment

router = APIRouter()


class CommentCreate(BaseModel):
    content: str
    task_id: UUID


class CommentResponse(BaseModel):
    id: UUID
    content: str
    task_id: UUID
    author_id: UUID
    created_at: datetime

    class Config:
        from_attributes = True


@router.get("/task/{task_id}", response_model=List[CommentResponse])
async def get_comments(
    task_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Comment).filter(Comment.task_id == task_id).order_by(Comment.created_at).all()


@router.post("/", response_model=CommentResponse, status_code=201)
async def create_comment(
    data: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = Comment(content=data.content, task_id=data.task_id, author_id=current_user.id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return comment


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.author_id == current_user.id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    db.delete(comment)
    db.commit()
