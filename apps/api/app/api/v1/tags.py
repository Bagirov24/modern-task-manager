"""Tags API — unified search endpoint (#ux-9).

GET /tags/search  — автокомплит для фильтр-дропдауна.
GET /tags/        — полный список (admin / settings страница).

Все теги возвращаются в формате UnifiedTagResponse.
"""
from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project_tag import ProjectTag
from app.models.task import Label  # Label живёт в task.py или отдельной модели
from app.models.user import User
from app.schemas.tag_search import TagSearchResponse
from app.schemas.unified_tag import TagScope, UnifiedTagResponse

router = APIRouter()


@router.get("/search", response_model=TagSearchResponse)
async def search_tags(
    q: str = Query("", max_length=100, description="Поисковый запрос (пустой → только recent)"),
    scope: TagScope = Query(TagScope.PROJECT, description="project | task | all"),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Автокомплит тегов для дропдауна фильтрации.

    Scope=project  → только ProjectTag (теги проектов пользователя)
    Scope=task     → только Label (теги задач)
    Scope=all      → объединённый список (ProjectTag + Label),
                     project-теги отображаются первыми

    Результаты сортируются по usage_count desc — самые популярные теги сверху.
    """
    project_tags: list[UnifiedTagResponse] = []
    task_tags: list[UnifiedTagResponse] = []

    # ── ProjectTag ──────────────────────────────────────────────────────────
    if scope in (TagScope.PROJECT, TagScope.BOTH):
        stmt = (
            select(ProjectTag)
            .order_by(ProjectTag.usage_count.desc())
            .limit(limit)
        )
        if q:
            stmt = stmt.where(ProjectTag.name.ilike(f"%{q}%"))
        rows = await db.execute(stmt)
        project_tags = [
            UnifiedTagResponse.from_project_tag(t) for t in rows.scalars().all()
        ]

    # ── Label (task tags) ───────────────────────────────────────────────────
    if scope in (TagScope.TASK, TagScope.BOTH):
        try:
            stmt = select(Label).order_by(Label.usage_count.desc()).limit(limit)
            if q:
                stmt = stmt.where(Label.name.ilike(f"%{q}%"))
            rows = await db.execute(stmt)
            task_tags = [
                UnifiedTagResponse.from_label(t) for t in rows.scalars().all()
            ]
        except Exception:
            # Label.usage_count может отсутствовать в старой схеме БД
            # — graceful degradation до пустого списка
            task_tags = []

    matching = project_tags + task_tags

    # ── Recent (заглушка — в prod заменить на Redis last-used per user) ─────
    recent = matching[:5]

    return TagSearchResponse(
        query=q,
        scope=scope,
        recent=recent,
        matching=matching,
        total_matching=len(matching),
    )


@router.get("/", response_model=List[UnifiedTagResponse])
async def list_all_tags(
    scope: TagScope = Query(TagScope.PROJECT),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Полный список тегов для страницы настроек / менеджера тегов."""
    result: list[UnifiedTagResponse] = []

    if scope in (TagScope.PROJECT, TagScope.BOTH):
        rows = await db.execute(select(ProjectTag).order_by(ProjectTag.name))
        result += [UnifiedTagResponse.from_project_tag(t) for t in rows.scalars().all()]

    if scope in (TagScope.TASK, TagScope.BOTH):
        try:
            rows = await db.execute(select(Label).order_by(Label.name))
            result += [UnifiedTagResponse.from_label(t) for t in rows.scalars().all()]
        except Exception:
            pass

    return result
