from celery import shared_task
import smtplib
from email.mime.text import MIMEText
from app.core.config import settings


class NotificationService:
    @staticmethod
    @shared_task
    def send_email(to: str, subject: str, body: str):
        msg = MIMEText(body, "html")
        msg["Subject"] = subject
        msg["To"] = to
        msg["From"] = "noreply@taskmanager.app"
        # SMTP sending logic here

    @staticmethod
    @shared_task
    def send_push_notification(user_id: str, title: str, body: str):
        # FCM push notification logic
        pass

    @staticmethod
    async def send_ws_notification(user_id: str, event: str, data: dict):
        from app.websocket.manager import ws_manager
        await ws_manager.send_to_user(user_id, {"event": event, "data": data})
