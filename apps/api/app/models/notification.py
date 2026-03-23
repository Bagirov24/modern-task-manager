import uuid
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.core.database import Base


class NotificationType(str, enum.Enum):
    TASK_ASSIGNED = "task_assigned"
    TASK_COMPLETED = "task_completed"
    TASK_UPDATED = "task_updated"
    TASK_COMMENT = "task_comment"
    PROJECT_INVITE = "project_invite"
    MENTION = "mention"
    DEADLINE = "deadline"
    SYSTEM = "system"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    type = Column(Enum(NotificationType), default=NotificationType.SYSTEM)
    title = Column(String(500), nullable=False)
    message = Column(Text)
    is_read = Column(Boolean, default=False)

    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=True)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", backref="notifications")
    task = relationship("Task", backref="notifications")
    project = relationship("Project", backref="notifications")
