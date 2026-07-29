"""Task Pydantic schemas.

Validation rules
----------------
- title: 1–500 chars, whitespace-stripped, must not be blank after strip.
- description: up to 10 000 chars (plain text or Tiptap HTML).
- description_format: 'plain' | 'markdown' | 'html' (default 'html').
  When format='html' the backend trusts the frontend has sanitised the
  content with DOMPurify before submission. A second server-side
  sanitisation pass should be added with bleach/nh3 for defence in depth.
- start_date must be before due_date when both are supplied.
- position: non-negative integer.
- search (Query param): max 200 chars (DoS guard).

UX additions (2026-07-29)
--------------------------
#ux-4  checklist_summary: ChecklistSummary — inline subtask progress
       so frontend can render "☑ 3/6" + mini progress-bar above the
       checklist section without a separate API call.
#ux-1  is_overdue: bool — computed field; True when due_date < now and
       status not in {done, archived}. Frontend renders red left-stripe
       and ⚠️ icon next to due_date on task cards.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.task import DescriptionFormat, TaskPriority, TaskStatus
from app.schemas.user import UserPublicResponse

_CLOSED = {TaskStatus.DONE, TaskStatus.ARCHIVED}


# ---------------------------------------------------------------------------
# #ux-4  Checklist summary (subtask progress)
# ---------------------------------------------------------------------------

class ChecklistSummary(BaseModel):
    """Inline checklist progress attached to every TaskResponse.

    Populated by the GET /tasks/{id} endpoint via a selectin on subtasks.
    When there are no subtasks, total=0 and progress=0.0.
    Frontend usage:
        if summary.total > 0:
            show "☑ {completed}/{total}" label + mini progress-bar
    """
    total: int = 0
    completed: int = 0
    progress: float = Field(0.0, description="0–100 completion %")

    @classmethod
    def from_subtasks(cls, subtasks: list) -> "ChecklistSummary":
        total = len(subtasks)
        completed = sum(1 for s in subtasks if s.status == TaskStatus.DONE)
        progress = round(completed / total * 100, 1) if total else 0.0
        return cls(total=total, completed=completed, progress=progress)


# ---------------------------------------------------------------------------
# Create / Update
# ---------------------------------------------------------------------------

class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: Optional[str] = Field(None, max_length=10_000)
    description_format: DescriptionFormat = DescriptionFormat.HTML
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
    description_format: Optional[DescriptionFormat] = None
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


# ---------------------------------------------------------------------------
# Response
# ---------------------------------------------------------------------------

class TaskResponse(BaseModel):
    id: UUID
    title: str
    description: Optional[str] = None
    description_format: DescriptionFormat = DescriptionFormat.HTML
    status: TaskStatus
    priority: TaskPriority
    due_date: Optional[datetime] = None
    start_date: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    project_id: Optional[UUID] = None
    assignee_id: Optional[UUID] = None
    assignee: Optional[UserPublicResponse] = None
    parent_id: Optional[UUID] = None
    position: int = 0
    created_at: datetime
    updated_at: datetime

    # #ux-4 — checklist progress (populated by endpoint, default=empty)
    checklist_summary: ChecklistSummary = Field(
        default_factory=ChecklistSummary,
        description="Subtask completion summary; total=0 when no subtasks exist",
    )

    # #ux-1 — overdue indicator
    is_overdue: bool = Field(
        False,
        description="True when due_date < now AND status not in {done, archived}",
    )

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_is_overdue(self) -> "TaskResponse":
        if (
            self.due_date
            and self.due_date < datetime.now(timezone.utc)
            and self.status not in _CLOSED
        ):
            self.is_overdue = True
        return self


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int
    page: int
    per_page: int
