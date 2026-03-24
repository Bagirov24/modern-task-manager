from celery import shared_task
import smtplib
from email.mime.text import MIMEText
from sqlalchemy.orm import Session
from uuid import UUID
from typing import Optional, List
from datetime import datetime
from app.core.config import settings
from app.models.notification import Notification, NotificationType


class NotificationService:
    def __init__(self, db: Session):
        self.db = db

    def create_notification(
        self,
        user_id: UUID,
        title: str,
        message: str,
        notification_type: NotificationType = NotificationType.INFO,
        related_task_id: Optional[UUID] = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=notification_type,
            related_task_id=related_task_id,
        )
        self.db.add(notification)
        self.db.commit()
        self.db.refresh(notification)
        return notification

    def get_notifications(
        self, user_id: UUID, unread_only: bool = False
    ) -> List[Notification]:
        query = self.db.query(Notification).filter(
            Notification.user_id == user_id
        )
        if unread_only:
            query = query.filter(Notification.is_read.is_(False))
        return query.order_by(Notification.created_at.desc()).all()

    def mark_as_read(self, notification_id: UUID) -> Optional[Notification]:
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id
        ).first()
        if notification:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(notification)
        return notification

    def mark_all_as_read(self, user_id: UUID) -> int:
        count = self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        ).update({"is_read": True, "read_at": datetime.utcnow()})
        self.db.commit()
        return count

    def delete_notification(self, notification_id: UUID) -> bool:
        notification = self.db.query(Notification).filter(
            Notification.id == notification_id
        ).first()
        if notification:
            self.db.delete(notification)
            self.db.commit()
            return True
        return False

    def get_unread_count(self, user_id: UUID) -> int:
        return self.db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        ).count()

    def notify_task_assigned(self, user_id: UUID, task_title: str, task_id: UUID):
        return self.create_notification(
            user_id=user_id,
            title="Task Assigned",
            message=f"You have been assigned to: {task_title}",
            notification_type=NotificationType.TASK_ASSIGNED,
            related_task_id=task_id,
        )

    def notify_task_due_soon(self, user_id: UUID, task_title: str, task_id: UUID):
        return self.create_notification(
            user_id=user_id,
            title="Task Due Soon",
            message=f"Task is due soon: {task_title}",
            notification_type=NotificationType.DUE_REMINDER,
            related_task_id=task_id,
        )

    def notify_comment_added(self, user_id: UUID, task_title: str, task_id: UUID, author: str):
        return self.create_notification(
            user_id=user_id,
            title="New Comment",
            message=f"{author} commented on: {task_title}",
            notification_type=NotificationType.COMMENT,
            related_task_id=task_id,
        )

    @staticmethod
    @shared_task
    def send_email(to: str, subject: str, body: str):
        msg = MIMEText(body, "html")
        msg["Subject"] = subject
        msg["To"] = to
        msg["From"] = "noreply@taskmanager.app"
        try:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)
        except Exception:
            pass

    @staticmethod
    @shared_task
    def send_push_notification(user_id: str, title: str, body: str):
        # FCM push notification logic
        pass

    @staticmethod
    async def send_ws_notification(user_id: str, event: str, data: dict):
        from app.websocket.manager import ws_manager
        await ws_manager.send_to_user(user_id, {"event": event, "data": data})
