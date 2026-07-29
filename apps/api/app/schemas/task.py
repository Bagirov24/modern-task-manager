from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from app.models.task import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None  # added for Timeline view
    project_id: Optional[UUID] = None
    parent_id: Optional[UUID] = None
    label_ids: Optional[List[UUID]] = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None  # added for Timeline view
    project_id: Optional[UUID] = None
    assignee_id: Optional[UUID] = None
    position: Optional[int] = None


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
    parent_id: Optional[UUID] = None
    position: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}  # replaces deprecated class Config


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int
    page: int
    per_page: int
