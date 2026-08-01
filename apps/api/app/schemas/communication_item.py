from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, model_validator

from app.core.sensitive_data import ensure_safe_text

SourceType = Literal["telegram", "email", "manual"]
SenderRole = Literal["developer", "designer", "manager", "lawyer", "client", "insurer", "other"]
Direction = Literal["incoming", "outgoing"]
ActionStatus = Literal["new", "needs_my_reply", "need_customer_input", "need_internal_input", "waiting_for_reply", "ready_to_respond", "fyi", "done", "archived"]
WaitingParty = Literal["internal", "client", "insurer", "vendor", "none"]
Importance = Literal["low", "normal", "high", "critical"]


class CommunicationItemCreate(BaseModel):
    workspace_id: UUID | None = None
    project_id: UUID | None = None
    task_id: UUID | None = None
    parent_communication_id: UUID | None = None
    source_type: SourceType = "manual"
    source_message_id: str | None = Field(None, max_length=255)
    source_thread_id: str | None = Field(None, max_length=255)
    sender_name: str = Field(..., min_length=1, max_length=255)
    sender_role: SenderRole = "other"
    direction: Direction = "incoming"
    subject: str | None = Field(None, max_length=500)
    body_preview: str = Field(..., min_length=1, max_length=10_000)
    source_url: str | None = Field(None, max_length=4000)
    received_at: datetime | None = None
    action_status: ActionStatus = "new"
    action_owner_id: UUID | None = None
    response_due_at: datetime | None = None
    waiting_for_user_id: UUID | None = None
    waiting_for_party: WaitingParty = "none"
    next_action: str | None = Field(None, max_length=2_000)
    needs_reply: bool = False
    importance: Importance = "normal"

    @model_validator(mode="after")
    def reject_sensitive_content(self):
        for value in (self.sender_name, self.subject, self.body_preview, self.source_url, self.next_action):
            ensure_safe_text(value)
        return self


class CommunicationItemUpdate(BaseModel):
    project_id: UUID | None = None
    task_id: UUID | None = None
    action_status: ActionStatus | None = None
    action_owner_id: UUID | None = None
    response_due_at: datetime | None = None
    waiting_for_user_id: UUID | None = None
    waiting_for_party: WaitingParty | None = None
    next_action: str | None = Field(None, max_length=2_000)
    needs_reply: bool | None = None
    importance: Importance | None = None
    subject: str | None = Field(None, max_length=500)
    body_preview: str | None = Field(None, max_length=10_000)
    source_url: str | None = Field(None, max_length=4000)

    @field_validator("subject", "body_preview", "source_url", "next_action")
    @classmethod
    def reject_sensitive_content(cls, value):
        return ensure_safe_text(value)


class CommunicationItemResponse(BaseModel):
    id: UUID
    workspace_id: UUID | None
    project_id: UUID | None
    task_id: UUID | None
    parent_communication_id: UUID | None
    source_type: str
    source_message_id: str | None
    source_thread_id: str | None
    sender_name: str
    sender_role: str
    direction: str
    subject: str | None
    body_preview: str
    source_url: str | None
    received_at: datetime
    action_status: str
    action_owner_id: UUID | None
    response_due_at: datetime | None
    waiting_for_user_id: UUID | None
    waiting_for_party: str
    next_action: str | None
    needs_reply: bool
    importance: str
    ai_summary: str | None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    closed_at: datetime | None
    model_config = {"from_attributes": True}


class CommunicationListResponse(BaseModel):
    items: list[CommunicationItemResponse]
    total: int
    groups: dict[str, int]
    page: int
    per_page: int
