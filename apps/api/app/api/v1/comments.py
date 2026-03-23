from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from uuid import UUID
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.comment import (
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    CommentListResponse,
)
from app.services.comment_service import CommentService

router = APIRouter()


def get_comment_service(db: Session = Depends(get_db)) -> CommentService:
    return CommentService(db)


@router.get("/task/{task_id}", response_model=CommentListResponse)
async def get_comments(
    task_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    service: CommentService = Depends(get_comment_service),
):
    comments, total = service.get_comments_by_task(task_id, page, per_page)
    return CommentListResponse(
        comments=comments,
        total=total,
        page=page,
        per_page=per_page,
    )


@router.post("/", response_model=CommentResponse, status_code=201)
async def create_comment(
    data: CommentCreate,
    current_user: User = Depends(get_current_user),
    service: CommentService = Depends(get_comment_service),
):
    return service.create_comment(data, current_user.id)


@router.patch("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: UUID,
    data: CommentUpdate,
    current_user: User = Depends(get_current_user),
    service: CommentService = Depends(get_comment_service),
):
    comment = service.update_comment(comment_id, data, current_user.id)
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    return comment


@router.delete("/{comment_id}", status_code=204)
async def delete_comment(
    comment_id: UUID,
    current_user: User = Depends(get_current_user),
    service: CommentService = Depends(get_comment_service),
):
    if not service.delete_comment(comment_id, current_user.id):
        raise HTTPException(status_code=404, detail="Comment not found")
