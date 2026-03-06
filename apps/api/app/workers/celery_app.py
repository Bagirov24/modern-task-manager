from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "taskmanager",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-overdue-tasks": {
            "task": "app.workers.tasks.check_overdue_tasks",
            "schedule": 3600.0,  # Every hour
        },
        "cleanup-old-notifications": {
            "task": "app.workers.tasks.cleanup_notifications",
            "schedule": 86400.0,  # Daily
        },
    },
)
