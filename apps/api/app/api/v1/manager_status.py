from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.services.access_policy import accessible_project_ids

router = APIRouter()


def _date(value):
    return value.astimezone(timezone.utc).strftime("%d.%m.%Y %H:%M UTC") if value else "не задан"


def _task_recommendation(task: Task) -> str:
    if task.is_blocked or task.workflow_status == "blocked":
        return f"Снять блокировку: {task.blocked_reason or 'уточнить причину'}"
    if task.workflow_status in ("waiting_for_internal", "waiting_for_client"):
        return task.follow_up_action_description or "Проверить срок ответа и подготовить follow-up"
    if not task.next_action_description:
        return "Определить следующее действие, владельца и срок"
    return task.next_action_description


@router.get("/tasks/{task_id}")
async def task_status(task_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project_ids = await accessible_project_ids(db, current_user.id)
    row = (await db.execute(select(Task, Project.name).outerjoin(Project).where(
        Task.id == task_id,
        or_(Task.assignee_id == current_user.id, Task.manager_id == current_user.id, Task.project_id.in_(project_ids)),
    ))).first()
    if not row:
        raise HTTPException(status_code=404, detail="Task not found")
    task, project_name = row
    known = [
        f"Проект: {project_name or 'без проекта'}", f"Статус: {task.workflow_status}",
        f"Риск: {task.risk_level}", f"Финальный срок: {_date(task.final_due_at or task.due_date)}",
        f"Срок ответа: {_date(task.response_due_at)}", f"Следующее действие до: {_date(task.next_action_due_at)}",
    ]
    unclear = []
    if not task.next_action_description:
        unclear.append("Не определено следующее действие")
    if not task.next_action_owner_id:
        unclear.append("Не назначен владелец следующего действия")
    if task.waiting_for_party != "none" and not task.response_due_at:
        unclear.append("Для ожидаемого ответа не задан срок")
    recommendation = _task_recommendation(task)
    markdown = "\n".join([f"**{task.title}**", *[f"- {item}" for item in known], "", f"Следующий шаг: {recommendation}"])
    return {"entity_type": "task", "entity_id": str(task.id), "title": task.title, "short": recommendation, "known": known, "unclear": unclear, "recommended_action": recommendation, "confidence": "high", "markdown": markdown}


@router.get("/projects/{project_id}")
async def project_status(project_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    project_ids = await accessible_project_ids(db, current_user.id)
    project = (await db.execute(select(Project).where(Project.id == project_id, Project.id.in_(project_ids)))).scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    now = datetime.now(timezone.utc)
    tasks = (await db.execute(select(Task).where(Task.project_id == project.id))).scalars().all()
    active = [task for task in tasks if task.status not in (TaskStatus.DONE, TaskStatus.ARCHIVED)]
    overdue = [task for task in active if (task.final_due_at or task.due_date) and (task.final_due_at or task.due_date) < now]
    blocked = [task for task in active if task.is_blocked or task.workflow_status == "blocked"]
    waiting = [task for task in active if task.workflow_status in ("waiting_for_internal", "waiting_for_client")]
    risky = [task for task in active if task.risk_level in ("high", "critical")]
    done_count = len(tasks) - len(active)
    progress = round(done_count / len(tasks) * 100) if tasks else 0
    health = "Off track" if overdue or any(task.risk_level == "critical" for task in risky) else "At risk" if blocked or risky else "On track"
    reason = f"{len(overdue)} просрочено, {len(blocked)} блокеров, {len(waiting)} ожидают ответа"
    recommendation = "Разобрать просрочки и блокеры" if health != "On track" else "Продолжать по плану и проверить ближайший milestone"
    known = [f"Прогресс: {progress}%", f"Health: {health}", reason, f"Ближайший milestone: {_date(project.due_date)}"]
    markdown = "\n".join([f"**{project.name}: {health}**", *[f"- {item}" for item in known], "", f"Рекомендуемое действие: {recommendation}"])
    return {"entity_type": "project", "entity_id": str(project.id), "title": project.name, "short": reason, "known": known, "unclear": [], "recommended_action": recommendation, "confidence": "high", "markdown": markdown}
