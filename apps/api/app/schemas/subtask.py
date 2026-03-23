from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.models.task import TaskStatus, TaskPriority


class SubtaskCreate(BaseModel):
    """Schema for creating a subtask (child task)."""
    title: str = Field(..., min_length=1, max_length=500, description="Subtask title")
    description: Optional[str] = Field(None, description="Subtask description")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, description="Subtask priority")
    due_date: Optional[datetime] = Field(None, description="Subtask due date")
    assignee_id: Optional[UUID] = Field(None, description="Assigned user ID")
    parent_id: UUID = Field(..., description="Parent task ID")


class SubtaskUpdate(BaseModel):
    """Schema for updating a subtask."""
    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Updated subtask title")
    description: Optional[str] = Field(None, description="Updated subtask description")
    status: Optional[TaskStatus] = Field(None, description="Updated subtask status")
    priority: Optional[TaskPriority] = Field(None, description="Updated subtask priority")
    due_date: Optional[datetime] = Field(None, description="Updated due date")
    assignee_id: Optional[UUID] = Field(None, description="Updated assigned user ID")


class SubtaskResponse(BaseModel):
    """Schema for subtask response."""
    id: UUID
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime]
    completed_at: Optional[datetime]
    parent_id: Optional[UUID]
    assignee_id: Optional[UUID]
    position: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class SubtaskListResponse(BaseModel):
    """Schema for subtask list response."""
    subtasks: List[SubtaskResponse]
    total: int
    completed: int
    progress: float = Field(description="Completion progress percentage (0-100)")


class SubtaskReorder(BaseModel):
    """Schema for reordering subtasks."""
    subtask_ids: List[UUID] = Field(..., description="Ordered list of subtask IDs")


class SubtaskToggle(BaseModel):
    """Schema for toggling subtask completion status."""
    is_completed: bool = Field(..., description="Whether the subtask is completed")
