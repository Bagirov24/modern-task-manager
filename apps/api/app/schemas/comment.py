from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime


class CommentCreate(BaseModel):
    """Schema for creating a new comment."""
    content: str = Field(..., min_length=1, max_length=5000, description="Comment text content")
    task_id: UUID = Field(..., description="ID of the task this comment belongs to")


class CommentUpdate(BaseModel):
    """Schema for updating an existing comment."""
    content: Optional[str] = Field(None, min_length=1, max_length=5000, description="Updated comment text")


class CommentResponse(BaseModel):
    """Schema for comment response."""
    id: UUID
    content: str
    task_id: UUID
    author_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CommentWithAuthor(CommentResponse):
    """Schema for comment response with author details."""
    author_name: Optional[str] = None
    author_email: Optional[str] = None


class CommentListResponse(BaseModel):
    """Schema for paginated comment list response."""
    comments: List[CommentResponse]
    total: int
    page: int
    per_page: int
