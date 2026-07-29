"""Task detail panel endpoint — собирает правую панель задачи (#ux-7).

GET /tasks/{task_id}/panel

Заменяет 3+ отдельных запросов одним:
  GET /tasks/{id}           → базовые поля
  GET /tasks/{id}/deps      → зависимости  
  GET /projects/{id}/activity → история
  GET /projects/{id}/members  → участники
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project_activity import ProjectActivity
from app.models.project_member import ProjectMember
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.schemas.task_detail_panel import (
    ActivityEvent, DependencyPreview,
    LinksSection, TaskDetailPanelResponse,
    WhoSection, WhereSection,
)
from app.schemas.unified_tag import UnifiedTagResponse

router = APIRouter()

_STATUS_COLOR = {
    TaskStatus.TODO:        "#8892aa",
    TaskStatus.IN_PROGRESS: "#38bdf8",
    TaskStatus.IN_REVIEW:   "#a78bfa",
    TaskStatus.DONE:        "#34d399",
    TaskStatus.ARCHIVED:    "#475569",
}

_ACTION_LABELS = {
    "project_updated":   "обновил проект",
    "member_invited":    "добавил участника",
    "member_removed":    "удалил участника",
    "tag_added":         "добавил тег",
    "readme_updated":    "обновил описание",
    "project_created":   "создал проект",
    "project_archived":  "архивировал проект",
    "project_pinned":    "закрепил проект",
    "project_unpinned":  "открепил проект",
    "project_reordered": "изменил порядок",
    "member_role_changed": "изменил роль участника",
    "project_deleted":   "удалил проект",
}


def _time_ago(dt: datetime) -> str:
    """Локализованная строка 'N мин назад' / 'вчера' / дата."""
    now = datetime.now(timezone.utc)
    dt_aware = dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt
    diff = now - dt_aware
    s = int(diff.total_seconds())
    if s < 60:     return "только что"
    if s < 3600:   return f"{s // 60} мин"
    if s < 86400:  return f"{s // 3600} ч"
    if s < 172800: return "вчера"
    return dt_aware.strftime("%d.%m.%Y")


def _initials(name: str) -> str:
    parts = name.split()
    return "".join(p[0].upper() for p in parts[:2]) if parts else "?"


def _avatar_color(user_id: UUID) -> str:
    return "#" + str(user_id).replace("-", "")[:6]


@router.get("/{task_id}/panel", response_model=TaskDetailPanelResponse)
async def get_task_panel(
    task_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Собирает данные правой панели задачи одним запросом.

    Загружает:
    - задачу с assignee, members проекта, тегами (selectin)
    - зависимости (blocks + blocked_by) с preview
    - последние 5 событий activity log

    Возвращает TaskDetailPanelResponse с тремя аккордеон-секциями.
    """
    # ── Task ────────────────────────────────────────────────────────────────
    r = await db.execute(
        select(Task)
        .options(
            joinedload(Task.assignee),
            selectinload(Task.labels),
        )
        .where(Task.id == task_id)
    )
    task: Optional[Task] = r.scalars().first()
    if not task:
        raise HTTPException(404, "Task not found")

    # ── WHO section ─────────────────────────────────────────────────────────
    assignee_data = None
    members_data = []

    if task.assignee:
        u = task.assignee
        name = getattr(u, "full_name", None) or getattr(u, "username", str(u.id))
        assignee_data = {
            "user_id": str(u.id),
            "display_name": name,
            "initials": _initials(name),
            "avatar_color": _avatar_color(u.id),
            "role": "owner",
        }

    if task.project_id:
        member_r = await db.execute(
            select(ProjectMember)
            .options(joinedload(ProjectMember.user))
            .where(ProjectMember.project_id == task.project_id)
        )
        for m in member_r.scalars().all():
            if not m.user:
                continue
            name = getattr(m.user, "full_name", None) or getattr(m.user, "username", str(m.user_id))
            members_data.append({
                "user_id": str(m.user_id),
                "display_name": name,
                "initials": _initials(name),
                "avatar_color": _avatar_color(m.user_id),
                "role": m.role.value,
            })

    who = WhoSection(
        collapsed=False,
        badge_count=len(members_data) + (1 if assignee_data else 0),
        assignee=assignee_data,
        members=members_data,
    )

    # ── WHERE section ───────────────────────────────────────────────────────
    tags_data = []
    for label in getattr(task, "labels", []):
        t = UnifiedTagResponse.from_label(label)
        tags_data.append(t.model_dump())

    where = WhereSection(
        collapsed=False,
        badge_count=len(tags_data),
        project_id=task.project_id,
        project_name=None,   # enriched by caller if needed
        tags=tags_data,
    )

    # ── LINKS section ───────────────────────────────────────────────────────
    blocks_list: list[DependencyPreview] = []
    blocked_by_list: list[DependencyPreview] = []

    # Зависимости через TaskDependency model (если существует)
    try:
        from app.models.task_dependency import TaskDependency  # type: ignore
        dep_r = await db.execute(
            select(TaskDependency)
            .options(joinedload(TaskDependency.blocked_task))
            .where(TaskDependency.blocking_task_id == task_id)
        )
        for dep in dep_r.scalars().all():
            bt = dep.blocked_task
            if bt:
                now = datetime.now(timezone.utc)
                due = getattr(bt, "due_date", None)
                overdue = bool(due and due < now and bt.status not in {TaskStatus.DONE, TaskStatus.ARCHIVED})
                blocks_list.append(DependencyPreview(
                    id=bt.id, title=bt.title,
                    status=bt.status, priority=bt.priority,
                    is_overdue=overdue,
                ))

        blk_r = await db.execute(
            select(TaskDependency)
            .options(joinedload(TaskDependency.blocking_task))
            .where(TaskDependency.blocked_task_id == task_id)
        )
        for dep in blk_r.scalars().all():
            bt = dep.blocking_task
            if bt:
                now = datetime.now(timezone.utc)
                due = getattr(bt, "due_date", None)
                overdue = bool(due and due < now and bt.status not in {TaskStatus.DONE, TaskStatus.ARCHIVED})
                blocked_by_list.append(DependencyPreview(
                    id=bt.id, title=bt.title,
                    status=bt.status, priority=bt.priority,
                    is_overdue=overdue,
                ))
    except (ImportError, Exception):
        pass  # TaskDependency model ещё не создана — graceful degradation

    # ── Activity ─────────────────────────────────────────────────────────────
    activity_events: list[ActivityEvent] = []
    if task.project_id:
        act_r = await db.execute(
            select(ProjectActivity)
            .where(ProjectActivity.project_id == task.project_id)
            .order_by(ProjectActivity.created_at.desc())
            .limit(5)
        )
        for evt in act_r.scalars().all():
            label = _ACTION_LABELS.get(evt.action, evt.action)
            actor_name = str(evt.user_id or "system")
            activity_events.append(ActivityEvent(
                action=evt.action,
                description=label,
                actor_initials=_initials(actor_name) if " " in actor_name else actor_name[:2].upper(),
                actor_color=_avatar_color(evt.user_id) if evt.user_id else "#475569",
                time_ago=_time_ago(evt.created_at),
                is_system=(evt.user_id is None),
            ))

    links = LinksSection(
        collapsed=True,  # по умолчанию свёрнуто — меньше шума
        badge_count=len(blocks_list) + len(blocked_by_list),
        blocks=blocks_list,
        blocked_by=blocked_by_list,
        recent_activity=activity_events,
    )

    return TaskDetailPanelResponse(task_id=task_id, who=who, where=where, links=links)
