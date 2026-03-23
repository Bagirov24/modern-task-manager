from pydantic import BaseModel, Field, field_validator
from typing import Optional, List
from uuid import UUID
from datetime import datetime
import re


class LabelCreate(BaseModel):
    """Schema for creating a new label."""
    name: str = Field(..., min_length=1, max_length=100, description="Label name")
    color: str = Field(default="#38bdf8", description="Hex color code for the label")

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: str) -> str:
        if not re.match(r"^#[0-9A-Fa-f]{6}$", v):
            raise ValueError("Color must be a valid hex color code (e.g. #38bdf8)")
        return v


class LabelUpdate(BaseModel):
    """Schema for updating an existing label."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Updated label name")
    color: Optional[str] = Field(None, description="Updated hex color code")

    @field_validator("color")
    @classmethod
    def validate_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and not re.match(r"^#[0-9A-Fa-f]{6}$", v):
            raise ValueError("Color must be a valid hex color code (e.g. #38bdf8)")
        return v


class LabelResponse(BaseModel):
    """Schema for label response."""
    id: UUID
    name: str
    color: str
    created_at: datetime

    class Config:
        from_attributes = True


class LabelWithTaskCount(LabelResponse):
    """Schema for label response with task count."""
    task_count: int = 0


class LabelListResponse(BaseModel):
    """Schema for label list response."""
    labels: List[LabelResponse]
    total: int


class LabelAssign(BaseModel):
    """Schema for assigning/unassigning labels to a task."""
    label_ids: List[UUID] = Field(..., description="List of label IDs to assign to the task")
