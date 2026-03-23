from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.models.notification import NotificationType


class NotificationCreate(BaseModel):
    """Schema for creating a new notification."""
    type: NotificationType = Field(default=NotificationType.SYSTEM, description="Notification type")
    title: str = Field(..., min_length=1, max_length=500, description="Notification title")
    message: Optional[str] = Field(None, description="Notification message body")
    user_id: UUID = Field(..., description="Target user ID")
    task_id: Optional[UUID] = Field(None, description="Related task ID")
    project_id: Optional[UUID] = Field(None, description="Related project ID")


class NotificationUpdate(BaseModel):
    """Schema for updating a notification (mark as read)."""
    is_read: Optional[bool] = Field(None, description="Read status")


class NotificationResponse(BaseModel):
    """Schema for notification response."""
    id: UUID
    type: NotificationType
    title: str
    message: Optional[str]
    is_read: bool
    user_id: UUID
    task_id: Optional[UUID]
    project_id: Optional[UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationListResponse(BaseModel):
    """Schema for paginated notification list response."""
    notifications: List[NotificationResponse]
    total: int
    unread_count: int
    page: int
    per_page: int


class NotificationMarkAllRead(BaseModel):
    """Schema for marking all notifications as read."""
    user_id: UUID = Field(..., description="User ID whose notifications to mark as read")


class NotificationBulkDelete(BaseModel):
    """Schema for bulk deleting notifications."""
    notification_ids: List[UUID] = Field(..., description="List of notification IDs to delete")


class NotificationPreferences(BaseModel):
    """Schema for notification preferences."""
    email_enabled: bool = Field(default=True, description="Receive email notifications")
    push_enabled: bool = Field(default=True, description="Receive push notifications")
    task_assigned: bool = Field(default=True, description="Notify when task is assigned")
    task_completed: bool = Field(default=True, description="Notify when task is completed")
    task_commented: bool = Field(default=True, description="Notify on new comments")
    deadline_reminder: bool = Field(default=True, description="Notify before deadline")
    project_invite: bool = Field(default=True, description="Notify on project invitations")
    mention: bool = Field(default=True, description="Notify on mentions")
