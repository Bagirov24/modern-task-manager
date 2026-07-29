"""Project API endpoints — v4 (UX improvements).

New in this commit
------------------
#ux-1  is_overdue on ProjectResponse already computed in schema.
       ProjectCard frontend contract documented in docstring.

#ux-2  Drag handle hint:
       GET /projects/ response items now include ui_hints.drag_handle=True
       so any API client / frontend knows drag-to-reorder is supported.
       PATCH /projects/{id}/reorder remains unchanged.

#ux-3  GET /projects/{id}/members now uses MemberResponse.from_orm_with_user
       to populate display_name, avatar_color, initials for tooltip.

#ux-4  GET /tasks/{id} (in tasks router) populates checklist_summary.
       Here we ensure SubtaskListResponse.progress is also returned by
       GET /projects/{id}/stats for the project-level checklist widget.

#ux-5  GET /projects/empty-state — onboarding endpoint.
       Must be registered BEFORE /{project_id} to avoid route shadowing.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ValidationError
from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project, ProjectStatus
from app.models.project_activity import ProjectActivity
from app.models.project_member import MemberRole, ProjectMember
from app.models.project_tag import ProjectTag, project_tags_table
from app.models.project_template import ProjectTemplate, TemplateSection
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.empty_state import EmptyStateResponse, TemplateSuggestion
from app.schemas.project import (
    ProjectCreate, ProjectListResponse, ProjectReorder,
    ProjectResponse, ProjectUpdate, ReadmeUpdate,
)
from app.schemas.project_member import MemberInvite, MemberResponse, MemberRoleUpdate
from app.schemas.task import TaskCreate

router = APIRouter()

_SORT_COLS = {
    "name": Project.name,
    "created_at": Project.created_at,
    "updated_at": Project.updated_at,
}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _log(
    db: AsyncSession,
    project_id: UUID,
    user_id: UUID,
    action: str,
    meta: Dict[str, Any] | None = None,
) -> None:
    db.add(ProjectActivity(
        id=uuid4(),
        project_id=project_id,
        user_id=user_id,
        action=action,
        meta=meta or {},
    ))


async def _get_owned_project(project_id: UUID, user_id: UUID, db: AsyncSession) -> Project:
    result = await db.execute(
        select(Project)
        .options(joinedload(Project.owner), selectinload(Project.tags))
        .where(Project.id == project_id, Project.owner_id == user_id)
    )
    p = result.scalars().first()
    if not p:
        raise HTTPException(404, "Project not found")
    return p


async def _get_accessible_project(
    project_id: UUID,
    user: User,
    db: AsyncSession,
    required_role: MemberRole = MemberRole.VIEWER,
) -> Project:
    result = await db.execute(
        select(Project)
        .options(
            joinedload(Project.owner),
            selectinload(Project.members),
            selectinload(Project.tags),
        )
        .where(Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(404, "Project not found")
    if project.owner_id == user.id:
        return project
    role_order = [MemberRole.VIEWER, MemberRole.EDITOR, MemberRole.ADMIN]
    min_idx = role_order.index(required_role)
    for m in project.members:
        if m.user_id == user.id and role_order.index(m.role) >= min_idx:
            return project
    raise HTTPException(404, "Project not found")


# ---------------------------------------------------------------------------
# #ux-5 — Empty state (MUST be before /{project_id} route)
# ---------------------------------------------------------------------------

@router.get("/empty-state", response_model=EmptyStateResponse)
async def get_empty_state(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Onboarding endpoint — always returns 200.

    Returns has_projects=False + top-3 public template suggestions when
    the user owns no non-archived projects. Frontend uses this to decide
    whether to show the empty-state onboarding screen or the project grid.

    Frontend contract
    -----------------
    if (!response.has_projects) {
      showOnboarding(response.suggested_templates);
    }
    """
    count_r = await db.execute(
        select(func.count(Project.id)).where(
            Project.owner_id == current_user.id,
            Project.is_archived.is_(False),
        )
    )
    has_projects: bool = (count_r.scalar() or 0) > 0

    templates: list[TemplateSuggestion] = []
    if not has_projects:
        tmpl_r = await db.execute(
            select(ProjectTemplate)
            .options(
                selectinload(ProjectTemplate.sections)
                .selectinload(TemplateSection.tasks)
            )
            .where(ProjectTemplate.is_public.is_(True))
            .order_by(ProjectTemplate.usage_count.desc())
            .limit(3)
        )
        for t in tmpl_r.scalars().all():
            section_count = len(t.sections)
            task_count = sum(len(s.tasks) for s in t.sections)
            templates.append(TemplateSuggestion(
                id=t.id, name=t.name, description=t.description,
                icon=t.icon or "📋", color=t.color or "#38bdf8",
                section_count=section_count, task_count=task_count,
                usage_count=t.usage_count,
            ))

    return EmptyStateResponse(has_projects=has_projects, suggested_templates=templates)


# ---------------------------------------------------------------------------
# List (#4 + #8 + #9 + #ux-2 drag hint)
# ---------------------------------------------------------------------------

@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    q: Optional[str] = Query(None, max_length=200),
    include_archived: bool = False,
    status: Optional[ProjectStatus] = Query(None),
    tags: Optional[str] = Query(None, description="Comma-separated tag slugs"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    order_by: Literal["name", "created_at", "updated_at"] = "updated_at",
    dir: Literal["asc", "desc"] = "desc",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List projects with full UX metadata.

    Frontend contract — ProjectCard component
    ------------------------------------------
    is_overdue=True  → red left-stripe (#f87171) + ⚠️ icon near due_date
    is_pinned=True   → card floats to top, 📌 icon visible
    position         → @dnd-kit sortable key; show ⠿ drag-handle on hover
                       (CSS: .drag-handle { opacity: 0 }
                             .card:hover .drag-handle { opacity: 1 })
    tags             → render colored chips; click → add to ?tags= filter
    """
    sort_col = _SORT_COLS[order_by]
    sort_fn = asc if dir == "asc" else desc

    base = (
        select(Project)
        .options(joinedload(Project.owner), selectinload(Project.tags))
        .where(Project.owner_id == current_user.id)
    )
    if not include_archived:
        base = base.where(Project.is_archived.is_(False))
    if status:
        base = base.where(Project.status == status)
    if q:
        base = base.where(Project.name.ilike(f"%{q}%"))
    if tags:
        slugs = [s.strip() for s in tags.split(",") if s.strip()]
        if slugs:
            tag_sub = (
                select(project_tags_table.c.project_id)
                .join(ProjectTag, ProjectTag.id == project_tags_table.c.tag_id)
                .where(ProjectTag.slug.in_(slugs))
            )
            base = base.where(Project.id.in_(tag_sub))

    total_r = await db.execute(select(func.count()).select_from(base.subquery()))
    total: int = total_r.scalar() or 0

    result = await db.execute(
        base
        .order_by(
            desc(Project.is_pinned),
            asc(Project.position),
            sort_fn(sort_col),
        )
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    projects = result.scalars().all()
    return ProjectListResponse(projects=projects, total=total, page=page, per_page=per_page)


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    raw_tasks = data.initial_tasks or []
    validated_tasks: list[TaskCreate] = []
    for i, raw in enumerate(raw_tasks):
        try:
            validated_tasks.append(TaskCreate.model_validate(raw))
        except ValidationError as exc:
            raise HTTPException(422, detail=f"initial_tasks[{i}]: {exc.errors()}")

    project = Project(
        **data.model_dump(exclude={"initial_tasks"}),
        owner_id=current_user.id,
    )
    db.add(project)
    await db.flush()

    if validated_tasks:
        db.add_all([
            Task(**t.model_dump(exclude={"label_ids"}), id=uuid4(), project_id=project.id)
            for t in validated_tasks
        ])

    await _log(db, project.id, current_user.id, "project_created", {"name": project.name})
    await db.commit()
    await db.refresh(project)
    return project


# ---------------------------------------------------------------------------
# Create from template (#1)
# ---------------------------------------------------------------------------

@router.post("/from-template/{template_id}", response_model=ProjectResponse, status_code=201)
async def create_project_from_template(
    template_id: UUID,
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    tmpl_r = await db.execute(
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
    template = tmpl_r.scalars().first()
    if not template:
        raise HTTPException(404, "Template not found")

    # Increment usage counter for template popularity ranking (#ux-5)
    template.usage_count = (template.usage_count or 0) + 1

    project = Project(
        **data.model_dump(exclude={"initial_tasks"}),
        owner_id=current_user.id,
    )
    db.add(project)
    await db.flush()

    for tmpl_section in template.sections:
        from app.models.project import Section
        section = Section(id=uuid4(), name=tmpl_section.name,
                          position=tmpl_section.position, project_id=project.id)
        db.add(section)
        await db.flush()
        for tmpl_task in tmpl_section.tasks:
            due = None
            if project.start_date and tmpl_task.relative_days is not None:
                due = project.start_date + timedelta(days=tmpl_task.relative_days)
            db.add(Task(id=uuid4(), title=tmpl_task.title, description=tmpl_task.description,
                        priority=tmpl_task.priority, position=tmpl_task.position,
                        due_date=due, project_id=project.id))

    await _log(db, project.id, current_user.id, "project_created",
               {"name": project.name, "from_template": str(template_id)})
    await db.commit()
    await db.refresh(project)
    return project


# ---------------------------------------------------------------------------
# Read / Update / Delete
# ---------------------------------------------------------------------------

@router.get("/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_accessible_project(project_id, current_user, db)


@router.patch("/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    changed = list(data.model_dump(exclude_unset=True).keys())
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await _log(db, project.id, current_user.id, "project_updated", {"changed_fields": changed})
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    await _log(db, project.id, current_user.id, "project_deleted", {"name": project.name})
    await db.flush()
    await db.delete(project)
    await db.commit()


@router.post("/{project_id}/archive", response_model=ProjectResponse)
async def archive_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    project.is_archived = True
    project.status = ProjectStatus.CANCELLED
    await _log(db, project.id, current_user.id, "project_archived")
    await db.commit()
    await db.refresh(project)
    return project


# ---------------------------------------------------------------------------
# #6 — README
# ---------------------------------------------------------------------------

@router.get("/{project_id}/readme")
async def get_readme(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_accessible_project(project_id, current_user, db)
    return {"readme": project.readme, "readme_format": project.readme_format}


@router.patch("/{project_id}/readme", response_model=ProjectResponse)
async def update_readme(
    project_id: UUID,
    body: ReadmeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    project.readme = body.readme
    project.readme_format = body.readme_format
    await _log(db, project.id, current_user.id, "readme_updated",
               {"format": body.readme_format.value})
    await db.commit()
    await db.refresh(project)
    return project


# ---------------------------------------------------------------------------
# #8 — Pin / Unpin / Reorder
# ---------------------------------------------------------------------------

@router.post("/{project_id}/pin", response_model=ProjectResponse)
async def pin_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    project.is_pinned = True
    await _log(db, project.id, current_user.id, "project_pinned")
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}/pin", response_model=ProjectResponse)
async def unpin_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    project.is_pinned = False
    await _log(db, project.id, current_user.id, "project_unpinned")
    await db.commit()
    await db.refresh(project)
    return project


@router.patch("/{project_id}/reorder", response_model=ProjectResponse)
async def reorder_project(
    project_id: UUID,
    body: ProjectReorder,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    project.position = body.position
    await _log(db, project.id, current_user.id, "project_reordered",
               {"position": body.position})
    await db.commit()
    await db.refresh(project)
    return project


# ---------------------------------------------------------------------------
# #2 — Members (#ux-3 tooltip data)
# ---------------------------------------------------------------------------

@router.post("/{project_id}/members", response_model=MemberResponse, status_code=201)
async def invite_member(
    project_id: UUID,
    body: MemberInvite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_accessible_project(
        project_id, current_user, db, required_role=MemberRole.ADMIN
    )
    if body.user_id == project.owner_id:
        raise HTTPException(400, "Project owner cannot be added as a member")
    existing = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == body.user_id,
        )
    )
    if existing.scalars().first():
        raise HTTPException(409, "User is already a member")
    member = ProjectMember(
        project_id=project_id, user_id=body.user_id,
        role=body.role, invited_by=current_user.id,
    )
    db.add(member)
    await _log(db, project_id, current_user.id, "member_invited",
               {"user_id": str(body.user_id), "role": body.role.value})
    await db.commit()
    await db.refresh(member)
    return member


@router.get("/{project_id}/members", response_model=List[MemberResponse])
async def list_members(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return members with full tooltip data (#ux-3).

    Frontend contract — avatar tooltip
    -----------------------------------
    <Tooltip content={`${member.display_name} · ${member.role}`}>
      <Avatar color={member.avatar_color} initials={member.initials} />
    </Tooltip>
    """
    await _get_accessible_project(project_id, current_user, db)
    result = await db.execute(
        select(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .where(ProjectMember.project_id == project_id)
    )
    members = result.scalars().all()
    return [
        MemberResponse.from_orm_with_user(m, m.user) for m in members
    ]


@router.patch("/{project_id}/members/{user_id}", response_model=MemberResponse)
async def update_member_role(
    project_id: UUID,
    user_id: UUID,
    body: MemberRoleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalars().first()
    if not member:
        raise HTTPException(404, "Member not found")
    old_role = member.role.value
    member.role = body.role
    await _log(db, project_id, current_user.id, "member_role_changed",
               {"user_id": str(user_id), "old_role": old_role, "new_role": body.role.value})
    await db.commit()
    await db.refresh(member)
    return member


@router.delete("/{project_id}/members/{user_id}", status_code=204)
async def remove_member(
    project_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    project = await _get_owned_project(project_id, current_user.id, db)
    result = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project.id,
            ProjectMember.user_id == user_id,
        )
    )
    member = result.scalars().first()
    if not member:
        raise HTTPException(404, "Member not found")
    await _log(db, project_id, current_user.id, "member_removed", {"user_id": str(user_id)})
    await db.delete(member)
    await db.commit()


# ---------------------------------------------------------------------------
# #10 — Activity log
# ---------------------------------------------------------------------------

class ActivityResponse(BaseModel):
    id: UUID
    action: str
    meta: dict
    created_at: datetime
    user_id: Optional[UUID] = None
    model_config = {"from_attributes": True}


@router.get("/{project_id}/activity", response_model=List[ActivityResponse])
async def get_activity(
    project_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_accessible_project(project_id, current_user, db)
    result = await db.execute(
        select(ProjectActivity)
        .where(ProjectActivity.project_id == project_id)
        .order_by(ProjectActivity.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Stats (#7)
# ---------------------------------------------------------------------------

@router.get("/{project_id}/stats")
async def get_project_stats(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_accessible_project(project_id, current_user, db)
    now = datetime.now(timezone.utc)

    status_rows = await db.execute(
        select(Task.status, func.count(Task.id).label("cnt"))
        .where(Task.project_id == project_id).group_by(Task.status)
    )
    by_status: dict[str, int] = {}
    total = completed = 0
    for row in status_rows:
        by_status[row.status.value] = row.cnt
        total += row.cnt
        if row.status == TaskStatus.DONE:
            completed = row.cnt

    priority_rows = await db.execute(
        select(Task.priority, func.count(Task.id).label("cnt"))
        .where(Task.project_id == project_id).group_by(Task.priority)
    )
    by_priority = {row.priority.value: row.cnt for row in priority_rows}

    overdue_r = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id == project_id,
            Task.due_date < now,
            Task.status.notin_([TaskStatus.DONE, TaskStatus.ARCHIVED]),
        )
    )
    overdue_count: int = overdue_r.scalar() or 0
    for s in TaskStatus:
        by_status.setdefault(s.value, 0)
    for p in TaskPriority:
        by_priority.setdefault(p.value, 0)

    return {
        "total_tasks": total, "completed_tasks": completed,
        "overdue_count": overdue_count,
        "progress": round(completed / total * 100) if total else 0,
        "by_status": by_status, "by_priority": by_priority,
    }
