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
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.task import DescriptionFormat, TaskPriority, TaskStatus
from app.core.sensitive_data import ensure_safe_text
from app.schemas.user import UserPublicResponse

_CLOSED = {TaskStatus.DONE, TaskStatus.ARCHIVED}
WorkflowStatus = Literal[
    "inbox", "backlog", "clarification_needed", "planned", "ready", "in_progress",
    "waiting_for_internal", "waiting_for_client", "review", "ready_to_send",
    "done", "cancelled", "blocked",
]
TaskType = Literal["task", "bug", "request", "approval", "contract_approval", "incident", "release", "meeting", "follow_up", "requirement_clarification"]
WaitingParty = Literal["internal", "client", "insurer", "vendor", "none"]
RiskLevel = Literal["low", "medium", "high", "critical"]


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
    assignee_id: Optional[UUID] = None
    workflow_status: WorkflowStatus = "backlog"
    is_blocked: bool = False
    blocked_reason: Optional[str] = Field(None, max_length=2_000)
    blocked_by_task_id: Optional[UUID] = None
    context: Optional[str] = Field(None, max_length=20_000)
    expected_result: Optional[str] = Field(None, max_length=20_000)
    acceptance_criteria: Optional[str] = Field(None, max_length=20_000)
    next_action: Optional[str] = Field(None, max_length=2_000)
    estimate_minutes: Optional[int] = Field(None, ge=0, le=1_000_000)
    milestone: Optional[str] = Field(None, max_length=255)
    sprint: Optional[str] = Field(None, max_length=255)
    task_type: TaskType = "task"
    manager_id: Optional[UUID] = None
    final_due_at: Optional[datetime] = None
    response_due_at: Optional[datetime] = None
    next_action_owner_id: Optional[UUID] = None
    next_action_description: Optional[str] = Field(None, max_length=2_000)
    next_action_due_at: Optional[datetime] = None
    waiting_for_user_id: Optional[UUID] = None
    waiting_for_party: WaitingParty = "none"
    follow_up_action_description: Optional[str] = Field(None, max_length=2_000)
    risk_level: RiskLevel = "low"
    last_external_communication_at: Optional[datetime] = None
    communication_channel: Optional[str] = Field(None, max_length=30)
    label_ids: Optional[List[UUID]] = Field(default_factory=list)

    @field_validator("title", mode="before")
    @classmethod
    def strip_and_check_title(cls, v: str) -> str:
        stripped = v.strip()
        if not stripped:
            raise ValueError("title must not be blank or whitespace-only")
        return ensure_safe_text(stripped)

    @field_validator("description", "blocked_reason", "context", "expected_result", "acceptance_criteria", "next_action", "next_action_description", "follow_up_action_description")
    @classmethod
    def reject_sensitive_description(cls, v: Optional[str]) -> Optional[str]:
        return ensure_safe_text(v)

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
    workflow_status: Optional[WorkflowStatus] = None
    is_blocked: Optional[bool] = None
    blocked_reason: Optional[str] = Field(None, max_length=2_000)
    blocked_by_task_id: Optional[UUID] = None
    context: Optional[str] = Field(None, max_length=20_000)
    expected_result: Optional[str] = Field(None, max_length=20_000)
    acceptance_criteria: Optional[str] = Field(None, max_length=20_000)
    next_action: Optional[str] = Field(None, max_length=2_000)
    estimate_minutes: Optional[int] = Field(None, ge=0, le=1_000_000)
    milestone: Optional[str] = Field(None, max_length=255)
    sprint: Optional[str] = Field(None, max_length=255)
    task_type: Optional[TaskType] = None
    manager_id: Optional[UUID] = None
    final_due_at: Optional[datetime] = None
    response_due_at: Optional[datetime] = None
    next_action_owner_id: Optional[UUID] = None
    next_action_description: Optional[str] = Field(None, max_length=2_000)
    next_action_due_at: Optional[datetime] = None
    waiting_for_user_id: Optional[UUID] = None
    waiting_for_party: Optional[WaitingParty] = None
    follow_up_action_description: Optional[str] = Field(None, max_length=2_000)
    risk_level: Optional[RiskLevel] = None
    last_external_communication_at: Optional[datetime] = None
    communication_channel: Optional[str] = Field(None, max_length=30)

    @field_validator("title", mode="before")
    @classmethod
    def strip_and_check_title(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        stripped = v.strip()
        if not stripped:
            raise ValueError("title must not be blank or whitespace-only")
        return ensure_safe_text(stripped)

    @field_validator("description", "blocked_reason", "context", "expected_result", "acceptance_criteria", "next_action", "next_action_description", "follow_up_action_description")
    @classmethod
    def reject_sensitive_description(cls, v: Optional[str]) -> Optional[str]:
        return ensure_safe_text(v)

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
    workflow_status: WorkflowStatus = "backlog"
    is_blocked: bool = False
    blocked_reason: Optional[str] = None
    blocked_by_task_id: Optional[UUID] = None
    context: Optional[str] = None
    expected_result: Optional[str] = None
    acceptance_criteria: Optional[str] = None
    next_action: Optional[str] = None
    estimate_minutes: Optional[int] = None
    milestone: Optional[str] = None
    sprint: Optional[str] = None
    task_type: TaskType = "task"
    manager_id: Optional[UUID] = None
    manager: Optional[UserPublicResponse] = None
    final_due_at: Optional[datetime] = None
    response_due_at: Optional[datetime] = None
    next_action_owner_id: Optional[UUID] = None
    next_action_owner: Optional[UserPublicResponse] = None
    next_action_description: Optional[str] = None
    next_action_due_at: Optional[datetime] = None
    waiting_for_user_id: Optional[UUID] = None
    waiting_for_user: Optional[UserPublicResponse] = None
    waiting_for_party: WaitingParty = "none"
    follow_up_action_description: Optional[str] = None
    risk_level: RiskLevel = "low"
    last_activity_at: Optional[datetime] = None
    last_external_communication_at: Optional[datetime] = None
    communication_channel: Optional[str] = None
    is_planning_complete: bool = False
    documentation_count: int = 0
    comment_count: int = 0
    created_at: datetime
    updated_at: datetime

    checklist_summary: ChecklistSummary = Field(
        default_factory=ChecklistSummary,
        description="Subtask completion summary; total=0 when no subtasks exist",
    )
    is_overdue: bool = Field(
        False,
        description="True when due_date < now AND status not in {done, archived}",
    )

    model_config = {"from_attributes": True}

    @model_validator(mode="after")
    def compute_derived_fields(self) -> "TaskResponse":
        if (
            self.due_date
            and self.due_date < datetime.now(timezone.utc)
            and self.status not in _CLOSED
        ):
            self.is_overdue = True
        self.is_planning_complete = bool(
            self.context
            and self.expected_result
            and self.acceptance_criteria
            and self.assignee_id
            and self.project_id
        )
        return self


class TaskListResponse(BaseModel):
    tasks: List[TaskResponse]
    total: int
    page: int
    per_page: int
