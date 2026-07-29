"""Empty-state schemas for onboarding UX (#ux-5).

GET /projects/empty-state returns EmptyStateResponse so the frontend
knows whether to show the normal project grid or the onboarding screen.

When has_projects is False the frontend renders:

    ╭─────────────────────────────────────────╮
    │  📂  Пока нет проектов                  │
    │  Начните с шаблона или создайте свой    │
    │                                         │
    │  [🏃 Scrum Sprint]  [🚀 Запуск]  [✅]  │
    │                                         │
    │       [+ Создать пустой проект]         │
    ╰─────────────────────────────────────────╯

suggested_templates contains top-3 public templates sorted by
usage_count so the most popular ones surface first.
"""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class TemplateSuggestion(BaseModel):
    """Lightweight template card shown in the empty state."""

    id: UUID
    name: str
    description: Optional[str] = None
    icon: str = "📋"
    color: str = "#38bdf8"
    section_count: int = 0
    task_count: int = 0
    usage_count: int = 0

    model_config = {"from_attributes": True}


class EmptyStateResponse(BaseModel):
    """Response for GET /projects/empty-state.

    Always returns HTTP 200 so the frontend never needs to handle a 404
    just because the user has no projects yet.
    """

    has_projects: bool = Field(
        ...,
        description="False when the user owns 0 non-archived projects",
    )
    suggested_templates: List[TemplateSuggestion] = Field(
        default_factory=list,
        description="Top-3 public templates by usage_count for onboarding",
    )
    cta_primary: str = Field(
        "Создать из шаблона",
        description="Label for the primary call-to-action button",
    )
    cta_secondary: str = Field(
        "Создать пустой проект",
        description="Label for the secondary call-to-action button",
    )
