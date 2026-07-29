"""View mode & user preferences schemas (#ux-6).

Переключатель ⊞ ≡ ▦ в топбаре экрана «Проекты».

Фронтенд-контракт
-----------------
// URL-параметр синхронизируется с сохранённым предпочтением
const [view, setView] = useViewMode(); // hook читает ?view= или preferences.last_view_mode

// Топбар
<ViewToggle
  current={view}
  onChange={async (v) => {
    setView(v);
    await api.patch('/users/me/preferences', { last_view_mode: v });
  }}
/>

// Рендер
if (view === 'kanban') return <KanbanBoard projects={projects} />;
if (view === 'list')   return <ProjectTable projects={projects} />;
return <ProjectGrid projects={projects} />; // 'grid' default
"""
from __future__ import annotations

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ViewMode(str, Enum):
    GRID   = "grid"    # ⊞  карточки 2 колонки (текущий вид)
    LIST   = "list"    # ≡  компактные строки, сортировка по колонкам
    KANBAN = "kanban"  # ▦  Kanban по статусу (active/on_hold/completed)


class UserPreferencesUpdate(BaseModel):
    """PATCH /users/me/preferences — все поля опциональны."""
    last_view_mode: Optional[ViewMode] = Field(
        None,
        description="Последний выбранный вид экрана Проекты",
    )
    sidebar_collapsed: Optional[bool] = None
    theme: Optional[str] = Field(None, pattern="^(dark|light|system)$")


class UserPreferencesResponse(BaseModel):
    """GET /users/me/preferences"""
    last_view_mode: ViewMode = ViewMode.GRID
    sidebar_collapsed: bool = False
    theme: str = "dark"

    model_config = {"from_attributes": True}


class ProjectListWithViewResponse(BaseModel):
    """Расширенный ProjectListResponse с текущим видом.

    Клиент использует view_mode для восстановления UI
    без дополнительного запроса к /preferences.
    """
    from app.schemas.project import ProjectResponse
    from typing import List

    projects: List[ProjectResponse]
    total: int
    page: int
    per_page: int
    view_mode: ViewMode = ViewMode.GRID  # текущий вид пользователя
