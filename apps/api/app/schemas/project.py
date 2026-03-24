from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ProjectCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#38bdf8"
    icon: Optional[str] = None


class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_archived: Optional[bool] = None


class ProjectResponse(BaseModel):
    id: UUID
    name: str
    description: Optional[str]
    color: str
    icon: Optional[str]
    is_archived: bool
    owner_id: UUID
    created_at: datetime
    task_count: Optional[int] = 0

    class Config:
        from_attributes = True
