"""Task Pydantic schemas.

Validation rules
----------------
- title: 1–500 chars, whitespace-stripped, must not be blank after stripping.
- description: up to 10 000 chars.
- start_date must be before due_date when both are supplied.
- position: non-negative integer.
- search (used as a Query param in the router): max 200 chars.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.task import TaskPriority, TaskStatus
from app.schemas.user import UserPublicResponse


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=10_000)
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    project_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
    label_ids: Optional[List[UUID]] = Field(default_factory=list)

    @field_validator("title", mode="before")
    @classmethod
    def strip_and_check_title(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("title must not be blank or whitespace-only")
        return stripped

    @model_validator(mode="after")
    def check_dates(self) -> "TaskCreate":
        if self.start_date and self.due_date and self.start_date >= self.due_date:
            raise ValueError("start_date must be before due_date")
        return self


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=10_000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    project_id: Optional[UUID] = None
    assignee_id: Optional[UUID] = None
    position: Optional[int] = Field(None, ge=0)

    @field_validator("title", mode="before")
    @classmethod
    def strip_and_check_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            raise ValueError("title must not be blank or whitespace-only")
        return stripped

    @model_validator(mode="after")
    def check_dates(self) -> "TaskUpdate":
        if self.start_date and self.due_date and self.start_date >= self.due_date:
            raise ValueError("start_date must be before due_date")
        return self


class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    project_id: Optional[UUID] = None
    assignee_id: Optional[UUID] = None
    # Safe public profile — never leaks email / hashed_password.
    assignee: Optional[UserPublicResponse] = None
    parent_id: Optional[UUID] = None
    position: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int
    page: int
    per_page: int
