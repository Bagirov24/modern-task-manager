"""Right panel accordion schema for task detail view (#ux-7).

Правая панель задачи разделена на 3 коллапсируемых аккордеона.
GET /tasks/{id}/panel возвращает собранный объект.

Фронтенд-контракт
-----------------
// Каждый аккордеон коллапсируется независимо
// badge_count показывает кол-во элементов на сложенной секции

<Accordion
  sections={[
    { id: 'who',   title: 'Кто',   icon: '👤', ...panel.who },
    { id: 'where', title: 'Где',   icon: '🗂', ...panel.where },
    { id: 'links', title: 'Связи', icon: '🔗', ...panel.links },
  ]}
/>

// Секция WHO
<AssigneeRow member={panel.who.assignee} />
{panel.who.members.map(m => <MemberRow key={m.user_id} member={m} />)}

// Секция WHERE
<ProjectBadge project={panel.where.project} />
<SectionBadge section={panel.where.section} />
{panel.where.tags.map(t => <Tag key={t.id} tag={t} />)}

// Секция LINKS
{panel.links.blocks.map(d => <DepLink key={d.id} dep={d} />)}
{panel.links.blocked_by.map(d => <DepLink key={d.id} dep={d} />)}
<ActivityFeed events={panel.links.recent_activity} />
"""
from __future__ import annotations

from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.task import TaskPriority, TaskStatus


# ---------------------------------------------------------------------------
# Dependency preview — кликабельная ссылка (#ux-10)
# ---------------------------------------------------------------------------

class DependencyPreview(BaseModel):
    """Inline-превью зависимой задачи для рендера кликабельной ссылки.

    Фронтенд: <Link to={`/tasks/${dep.id}`}>{dep.title}</Link>
    Цвет иконки: is_overdue → red-400; status=done → muted; else → sky.
    """
    id: UUID
    title: str
    status: TaskStatus
    priority: TaskPriority
    is_overdue: bool = False
    assignee_initials: Optional[str] = None
    assignee_color: Optional[str] = None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Activity event (compact)
# ---------------------------------------------------------------------------

class ActivityEvent(BaseModel):
    action: str
    description: str          # human-readable строка, уже локализована
    actor_initials: str
    actor_color: str
    time_ago: str             # "5 мин", "1 ч", "вчера" — форматируется на сервере
    is_system: bool = False   # True → серая точка; False → цветная точка


# ---------------------------------------------------------------------------
# Accordion sections
# ---------------------------------------------------------------------------

class WhoSection(BaseModel):
    """Секция «Кто» — исполнитель + участники."""
    collapsed: bool = False
    badge_count: int = 0   # кол-во участников, показывается на свёрнутом аккордеоне

    assignee: Optional[dict] = None   # MemberResponse-совместимый объект
    members: List[dict] = Field(default_factory=list)


class WhereSection(BaseModel):
    """Секция «Где» — проект, секция, теги."""
    collapsed: bool = False
    badge_count: int = 0   # кол-во тегов

    project_id: Optional[UUID] = None
    project_name: Optional[str] = None
    project_color: Optional[str] = None
    section_id: Optional[UUID] = None
    section_name: Optional[str] = None
    tags: List[dict] = Field(default_factory=list)  # UnifiedTagResponse


class LinksSection(BaseModel):
    """Секция «Связи» — зависимости + последние события."""
    collapsed: bool = False
    badge_count: int = 0   # кол-во зависимостей

    blocks: List[DependencyPreview] = Field(
        default_factory=list,
        description="Задачи, которые ЭТА задача блокирует",
    )
    blocked_by: List[DependencyPreview] = Field(
        default_factory=list,
        description="Задачи, которые блокируют ЭТУ задачу",
    )
    recent_activity: List[ActivityEvent] = Field(
        default_factory=list,
        description="Последние 5 событий для компактного activity feed",
    )


# ---------------------------------------------------------------------------
# Root response
# ---------------------------------------------------------------------------

class TaskDetailPanelResponse(BaseModel):
    """GET /tasks/{id}/panel — собранная правая панель задачи.

    Единый объект, заменяющий 3+ отдельных запроса.
    Клиент кэширует под ключом ['task-panel', task_id].
    """
    task_id: UUID
    who: WhoSection
    where: WhereSection
    links: LinksSection
