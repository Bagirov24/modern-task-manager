"""Project templates endpoints.

GET  /project-templates/              — list public + own templates
GET  /project-templates/{id}          — get template with sections/tasks
POST /project-templates/              — create custom template
DELETE /project-templates/{id}        — delete own template

Built-in templates are seeded via seed_default_templates() called
from the app startup event in main.py.
"""
from __future__ import annotations

from typing import Any, List
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, model_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.sensitive_data import ensure_safe_text
from app.core.security import get_current_user
from app.models.project_template import ProjectTemplate, TemplateSection, TemplateTask
from app.models.user import User

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas (inline — small enough to not warrant a separate file)
# ---------------------------------------------------------------------------

class TemplateTaskSchema(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    priority: str = "medium"
    position: int = 0
    relative_days: int | None = None

    @model_validator(mode="after")
    def reject_sensitive_text(self):
        ensure_safe_text(self.title)
        ensure_safe_text(self.description)
        return self


class TemplateSectionSchema(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    position: int = 0
    tasks: List[TemplateTaskSchema] = Field(default_factory=list)


class TemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    icon: str = "📋"
    color: str = "#38bdf8"
    is_public: bool = False
    sections: List[TemplateSectionSchema] = Field(default_factory=list)

    @model_validator(mode="after")
    def reject_sensitive_text(self):
        ensure_safe_text(self.name)
        ensure_safe_text(self.description)
        return self


class TemplateResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    icon: str | None
    color: str | None
    is_public: bool
    owner_id: UUID | None
    sections: List[Any] = []

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Seed built-in templates (called on startup)
# ---------------------------------------------------------------------------

DEFAULT_TEMPLATES = [
    {
        "name": "Scrum Sprint",
        "description": "Классический двухнедельный спринт с Backlog, In Progress, Review и Done.",
        "icon": "🏃",
        "color": "#38bdf8",
        "sections": [
            {"name": "Backlog", "position": 0, "tasks": [
                {"title": "Уточнить требования", "priority": "high", "position": 0, "relative_days": 1},
                {"title": "Оценить задачи спринта", "priority": "high", "position": 1, "relative_days": 2},
            ]},
            {"name": "В работе", "position": 1, "tasks": []},
            {"name": "Ревью", "position": 2, "tasks": []},
            {"name": "Готово", "position": 3, "tasks": []},
        ],
    },
    {
        "name": "Запуск продукта",
        "description": "Полный цикл от исследования до релиза.",
        "icon": "🚀",
        "color": "#a78bfa",
        "sections": [
            {"name": "Исследование", "position": 0, "tasks": [
                {"title": "Анализ конкурентов", "priority": "high", "position": 0, "relative_days": 7},
                {"title": "Интервью с пользователями", "priority": "medium", "position": 1, "relative_days": 14},
            ]},
            {"name": "Дизайн", "position": 1, "tasks": [
                {"title": "Wireframes", "priority": "high", "position": 0, "relative_days": 21},
                {"title": "UI Kit", "priority": "medium", "position": 1, "relative_days": 28},
            ]},
            {"name": "Разработка", "position": 2, "tasks": [
                {"title": "MVP backend", "priority": "urgent", "position": 0, "relative_days": 42},
                {"title": "MVP frontend", "priority": "urgent", "position": 1, "relative_days": 42},
            ]},
            {"name": "QA", "position": 3, "tasks": [
                {"title": "Тестирование", "priority": "high", "position": 0, "relative_days": 49},
            ]},
            {"name": "Релиз", "position": 4, "tasks": [
                {"title": "Деплой в production", "priority": "urgent", "position": 0, "relative_days": 56},
            ]},
        ],
    },
    {
        "name": "Маркетинговая кампания",
        "description": "Планирование, контент, дистрибуция и аналитика.",
        "icon": "📣",
        "color": "#f59e0b",
        "sections": [
            {"name": "Планирование", "position": 0, "tasks": [
                {"title": "Определить целевую аудиторию", "priority": "high", "position": 0, "relative_days": 3},
                {"title": "Бюджет кампании", "priority": "high", "position": 1, "relative_days": 5},
            ]},
            {"name": "Контент", "position": 1, "tasks": [
                {"title": "Написать тексты", "priority": "medium", "position": 0, "relative_days": 10},
                {"title": "Дизайн баннеров", "priority": "medium", "position": 1, "relative_days": 12},
            ]},
            {"name": "Дистрибуция", "position": 2, "tasks": []},
            {"name": "Аналитика", "position": 3, "tasks": [
                {"title": "Настроить UTM-метки", "priority": "high", "position": 0, "relative_days": 14},
            ]},
        ],
    },
    {
        "name": "Личные задачи",
        "description": "Простой GTD-шаблон: Today, This Week, Someday.",
        "icon": "✅",
        "color": "#34d399",
        "sections": [
            {"name": "Сегодня", "position": 0, "tasks": []},
            {"name": "На этой неделе", "position": 1, "tasks": []},
            {"name": "Когда-нибудь", "position": 2, "tasks": []},
        ],
    },
]


async def seed_default_templates(db: AsyncSession) -> None:
    """Insert built-in templates if they don't exist yet (idempotent)."""
    for tpl in DEFAULT_TEMPLATES:
        exists = await db.execute(
            select(ProjectTemplate).where(
                ProjectTemplate.name == tpl["name"],
                ProjectTemplate.owner_id.is_(None),
            )
        )
        if exists.scalars().first():
            continue

        template = ProjectTemplate(
            id=uuid4(),
            name=tpl["name"],
            description=tpl.get("description"),
            icon=tpl.get("icon", "📋"),
            color=tpl.get("color", "#38bdf8"),
            is_public=True,
            owner_id=None,
        )
        db.add(template)
        await db.flush()

        for sec in tpl.get("sections", []):
            section = TemplateSection(
                id=uuid4(),
                name=sec["name"],
                position=sec["position"],
                template_id=template.id,
            )
            db.add(section)
            await db.flush()

            for t in sec.get("tasks", []):
                db.add(TemplateTask(
                    id=uuid4(),
                    title=t["title"],
                    priority=t.get("priority", "medium"),
                    position=t.get("position", 0),
                    relative_days=t.get("relative_days"),
                    section_id=section.id,
                ))

    await db.commit()


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[TemplateResponse])
async def list_templates(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return public templates + templates owned by current user."""
    result = await db.execute(
        select(ProjectTemplate)
        .options(selectinload(ProjectTemplate.sections))
        .where(
            (ProjectTemplate.is_public.is_(True))
            | (ProjectTemplate.owner_id == current_user.id)
        )
        .order_by(ProjectTemplate.name)
    )
    return result.scalars().all()


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectTemplate)
        .options(
            selectinload(ProjectTemplate.sections)
            .selectinload(TemplateSection.tasks)
        )
        .where(
            ProjectTemplate.id == template_id,
            (ProjectTemplate.is_public.is_(True))
            | (ProjectTemplate.owner_id == current_user.id),
        )
    )
    tpl = result.scalars().first()
    if not tpl:
        raise HTTPException(404, "Template not found")
    return tpl


@router.post("/", response_model=TemplateResponse, status_code=201)
async def create_template(
    data: TemplateCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = ProjectTemplate(
        id=uuid4(),
        name=data.name,
        description=data.description,
        icon=data.icon,
        color=data.color,
        is_public=data.is_public,
        owner_id=current_user.id,
    )
    db.add(template)
    await db.flush()

    for sec in data.sections:
        section = TemplateSection(
            id=uuid4(),
            name=sec.name,
            position=sec.position,
            template_id=template.id,
        )
        db.add(section)
        await db.flush()
        for t in sec.tasks:
            db.add(TemplateTask(
                id=uuid4(),
                title=t.title,
                description=t.description,
                priority=t.priority,
                position=t.position,
                relative_days=t.relative_days,
                section_id=section.id,
            ))

    await db.commit()
    await db.refresh(template)
    return template


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ProjectTemplate).where(
            ProjectTemplate.id == template_id,
            ProjectTemplate.owner_id == current_user.id,
        )
    )
    tpl = result.scalars().first()
    if not tpl:
        raise HTTPException(404, "Template not found or not owned by you")
    await db.delete(tpl)
    await db.commit()
