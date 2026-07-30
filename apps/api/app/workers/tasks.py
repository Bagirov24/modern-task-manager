"""Celery tasks for background processing.

All tasks use the SYNCHRONOUS SyncSessionLocal (psycopg2 / pg8000 driver)
because Celery workers run in their own process without an asyncio event
loop.  Never use AsyncSessionLocal here.

Idempotency guidelines
-----------------------
* Always use bind=True so the task instance is available for retry.
* Pass only serialisable primitives (str/int/UUID-as-str) in task args —
  never ORM objects (they cannot be JSON-serialised).
* Use autoretry_for + max_retries + exponential backoff on transient errors.
"""
from __future__ import annotations

from datetime import datetime, timezone

from celery.utils.log import get_task_logger

from app.workers.celery_app import celery_app
from app.core.database import SyncSessionLocal
from app.models.task import Task, TaskStatus

logger = get_task_logger(__name__)


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    retry_jitter=True,
)
def check_overdue_tasks(self):
    """Mark tasks past their due date and queue per-user reminder notifications."""
    now = datetime.now(timezone.utc)
    with SyncSessionLocal() as db:
        overdue = (
            db.query(Task)
            .filter(
                Task.status != TaskStatus.DONE,
                Task.due_date.isnot(None),
                Task.due_date < now,
            )
            .all()
        )
        logger.info("Found %d overdue tasks", len(overdue))
        for task in overdue:
            # Enqueue a lightweight reminder; pass str(uuid) — JSON-safe
            send_reminder.delay(str(task.id))


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=120,
    autoretry_for=(Exception,),
    retry_backoff=True,
)
def send_reminder(self, task_id: str):
    """Send a push/email reminder for a single overdue task.

    Args:
        task_id: String representation of the Task UUID.
    """
    with SyncSessionLocal() as db:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            logger.warning("send_reminder: task %s not found — skipping", task_id)
            return
        if task.status == TaskStatus.DONE:
            logger.info("send_reminder: task %s already done — skipping", task_id)
            return
        # TODO: integrate notification service (email / push)
        logger.info(
            "Reminder queued for task %s (assignee: %s)",
            task_id,
            task.assignee_id,
        )


@celery_app.task(
    bind=True,
    max_retries=2,
    default_retry_delay=300,
    autoretry_for=(Exception,),
)
def cleanup_notifications(self):
    """Remove notification records older than 30 days."""
    # TODO: implement once Notification model has a created_at filter
    logger.info("cleanup_notifications: task invoked (implementation pending)")
