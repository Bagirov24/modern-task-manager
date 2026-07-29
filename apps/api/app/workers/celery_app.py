"""Celery application factory.

Graceful shutdown
-----------------
Celery workers support SIGTERM gracefully by default: the worker finishes
all currently running tasks before exiting.  To ensure Docker/Kubernetes
respects this, the container must receive SIGTERM (not SIGKILL) and give
the worker enough time to drain (stop_grace_period in compose / terminationGracePeriodSeconds).

worker_max_tasks_per_child
--------------------------
Set to 1000 to recycle each child process after 1 000 tasks, preventing
gradual memory leaks from tasks that accumulate state.
"""
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "taskmanager",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    # Serialisation — never use pickle (RCE risk)
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",

    # Timezone
    timezone="UTC",
    enable_utc=True,

    # Worker hygiene — recycle child after N tasks to prevent memory leaks
    worker_max_tasks_per_child=1000,

    # Acknowledgement: ack only AFTER the task completes (at-least-once
    # delivery; tasks must be idempotent — see tasks.py)
    task_acks_late=True,
    worker_prefetch_multiplier=1,   # fair dispatch; avoids starving slow tasks

    # Result expiry — don't keep results forever
    result_expires=3600,

    # Periodic tasks (Celery Beat)
    beat_schedule={
        "check-overdue-tasks": {
            "task": "app.workers.tasks.check_overdue_tasks",
            "schedule": 3600.0,   # every hour
        },
        "cleanup-old-notifications": {
            "task": "app.workers.tasks.cleanup_notifications",
            "schedule": 86400.0,  # daily
        },
    },
)
