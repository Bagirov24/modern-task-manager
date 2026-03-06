from app.workers.celery_app import celery_app
from app.core.database import SessionLocal
from app.models.task import Task, TaskStatus
from datetime import datetime


@celery_app.task
def check_overdue_tasks():
    db = SessionLocal()
    try:
        overdue = db.query(Task).filter(
            Task.status != TaskStatus.DONE,
            Task.due_date < datetime.utcnow(),
        ).all()
        for task in overdue:
            # Send notification about overdue task
            pass
    finally:
        db.close()


@celery_app.task
def cleanup_notifications():
    # Remove old notifications
    pass


@celery_app.task
def send_reminder(task_id: str):
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if task and task.assignee:
            # Send reminder notification
            pass
    finally:
        db.close()
