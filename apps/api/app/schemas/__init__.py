# User schemas
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserLogin,
)

# Task schemas
from app.schemas.task import (
    TaskCreate,
    TaskUpdate,
    TaskResponse,
    TaskListResponse,
)

# Project schemas
from app.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)

# Comment schemas
from app.schemas.comment import (
    CommentCreate,
    CommentUpdate,
    CommentResponse,
    CommentWithAuthor,
    CommentListResponse,
)

# Label schemas
from app.schemas.label import (
    LabelCreate,
    LabelUpdate,
    LabelResponse,
    LabelWithTaskCount,
    LabelListResponse,
    LabelAssign,
)

# Notification schemas
from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
    NotificationListResponse,
    NotificationMarkAllRead,
    NotificationBulkDelete,
    NotificationPreferences,
)

# Subtask schemas
from app.schemas.subtask import (
    SubtaskCreate,
    SubtaskUpdate,
    SubtaskResponse,
    SubtaskListResponse,
    SubtaskReorder,
    SubtaskToggle,
)

__all__ = [
    # User
    "UserCreate", "UserUpdate", "UserResponse", "UserLogin",
    # Task
    "TaskCreate", "TaskUpdate", "TaskResponse", "TaskListResponse",
    # Project
    "ProjectCreate", "ProjectUpdate", "ProjectResponse", "ProjectListResponse",
    # Comment
    "CommentCreate", "CommentUpdate", "CommentResponse",
    "CommentWithAuthor", "CommentListResponse",
    # Label
    "LabelCreate", "LabelUpdate", "LabelResponse",
    "LabelWithTaskCount", "LabelListResponse", "LabelAssign",
    # Notification
    "NotificationCreate", "NotificationUpdate", "NotificationResponse",
    "NotificationListResponse", "NotificationMarkAllRead",
    "NotificationBulkDelete", "NotificationPreferences",
    # Subtask
    "SubtaskCreate", "SubtaskUpdate", "SubtaskResponse",
    "SubtaskListResponse", "SubtaskReorder", "SubtaskToggle",
]
