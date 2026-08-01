"""Unified tag schema — решает проблему двойной системы тегов (#ux-8).

Проблема
--------
В проекте существуют два независимых типа меток:
- ProjectTag (projects.py) — теги проекта, имеют slug, нет связи с задачами
- Label (label.py)         — теги задачи, нет slug, нет связи с проектами

Пользователь видит оба типа одинаково (#backend, #auth), но они не
фильтруют друг друга → путаница.

Решение
-------
UnifiedTagResponse — единый формат для обоих типов с:
1. visual_type: 'square' (ProjectTag) | 'round' (Label)
   Фронтенд рендерит разные border-radius:
   square → border-radius: 4px  (🗂 теги проекта)
   round  → border-radius: 9999px (🏷 теги задачи)

2. scope: 'project' | 'task' | 'both'
   'both' — тег используется и в проектах и в задачах (будущая унификация)

3. slug всегда присутствует — для URL-фильтрации (?tags=backend)
   У Label slug генерируется из name при создании если отсутствует.

Миграция
--------
LabelResponse и TagResponse остаются рабочими (обратная совместимость).
UnifiedTagResponse — новый общий формат для фильтр-дропдауна (#ux-9)
и правой панели задачи (#ux-7).

Фронтенд-контракт
-----------------
// Различение по visual_type
<Tag
  style={{
    borderRadius: tag.visual_type === 'round' ? '9999px' : '4px',
    backgroundColor: hexToRgba(tag.color, 0.12),
    borderColor: hexToRgba(tag.color, 0.4),
  }}
>
  {tag.visual_type === 'round' ? '🏷' : '🗂'} #{tag.name}
</Tag>
"""
from __future__ import annotations

from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class TagScope(str, Enum):
    PROJECT = "project"   # только ProjectTag
    TASK    = "task"      # только Label
    BOTH    = "both"      # унифицированный (будущее)


class TagVisualType(str, Enum):
    SQUARE = "square"   # border-radius: 4px  — теги проекта 🗂
    ROUND  = "round"    # border-radius: 9999px — теги задачи 🏷


class UnifiedTagResponse(BaseModel):
    """Единый формат тега для дропдауна, правой панели и фильтров."""

    id: UUID
    name: str
    slug: str           # URL-safe, для ?tags= фильтрации
    color: str          # #RRGGBB
    scope: TagScope
    visual_type: TagVisualType
    usage_count: int = Field(0, description="Кол-во использований для сортировки")

    model_config = {"from_attributes": True}

    @classmethod
    def from_project_tag(cls, tag) -> "UnifiedTagResponse":
        """Создать из ProjectTag ORM-объекта."""
        return cls(
            id=tag.id,
            name=tag.name,
            slug=tag.slug,
            color=getattr(tag, "color", "#38bdf8"),
            scope=TagScope.PROJECT,
            visual_type=TagVisualType.SQUARE,
            usage_count=getattr(tag, "usage_count", 0),
        )

    @classmethod
    def from_label(cls, label) -> "UnifiedTagResponse":
        """Создать из Label ORM-объекта.

        Slug генерируется из name если отсутствует:
        'My Backend' → 'my-backend'
        """
        import re
        raw_slug = getattr(label, "slug", None)
        if not raw_slug:
            raw_slug = re.sub(r"[^a-z0-9]+", "-", label.name.lower()).strip("-")
        return cls(
            id=label.id,
            name=label.name,
            slug=raw_slug,
            color=getattr(label, "color", "#a78bfa"),
            scope=TagScope.TASK,
            visual_type=TagVisualType.ROUND,
            usage_count=getattr(label, "usage_count", 0),
        )
