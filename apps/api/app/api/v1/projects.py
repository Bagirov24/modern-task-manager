"""Project API endpoints — v2.

What changed in this commit
---------------------------
#1  Templates
    POST /projects/from-template/{template_id}
    Clones a template's sections and tasks into a new project in one
    transaction. Task due_dates are computed as
    project.start_date + timedelta(days=relative_days) when start_date
    is provided.

#2  Members
    POST   /{id}/members          — invite user (owner or admin only)
    GET    /{id}/members          — list members (any member)
    PATCH  /{id}/members/{uid}    — change role (owner or admin only)
    DELETE /{id}/members/{uid}    — remove member (owner or admin only)
    _get_accessible_project() replaces _get_owned_project() for reads:
    owner OR member with editor+ role can access.

#4  Pagination + search + sort
    GET /projects/ now accepts:
      ?q=           substring search on name (ILIKE, max 200 chars)
      ?page=        1-based page number (default 1)
      ?per_page=    items per page (default 20, max 100)
      ?order_by=    name | created_at | updated_at  (default updated_at)
      ?dir=         asc | desc  (default desc)
    Returns ProjectListResponse {projects, total, page, per_page}.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Literal, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project, ProjectStatus
from app.models.project_member import MemberRole, ProjectMember
from app.models.project_template import ProjectTemplate, TemplateSection
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.project import (
    ProjectCreate, ProjectListResponse, ProjectResponse, ProjectUpdate,
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

async def _get_owned_project(
    project_id: UUID, user_id: UUID, db: AsyncSession
) -> Project:
    """Ownership check — used for write operations (update/delete/archive)."""
    result = await db.execute(
        select(Project)
        .options(joinedload(Project.owner))
        .where(Project.id == project_id, Project.owner_id == user_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


async def _get_accessible_project(
    project_id: UUID, user: User, db: AsyncSession,
    required_role: MemberRole = MemberRole.VIEWER,
) -> Project:
    """Read access: owner OR member with sufficient role.

    Returns 404 for both missing and inaccessible projects.
    """
    result = await db.execute(
        select(Project)
        .options(joinedload(Project.owner), selectinload(Project.members))
        .where(Project.id == project_id)
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if project.owner_id == user.id:
        return project  # owner has full access

    role_order = [MemberRole.VIEWER, MemberRole.EDITOR, MemberRole.ADMIN]
    min_idx = role_order.index(required_role)

    for m in project.members:
        if m.user_id == user.id and role_order.index(m.role) >= min_idx:
            return project

    raise HTTPException(status_code=404, detail="Project not found")


# ---------------------------------------------------------------------------
# #4 — List with pagination + search + sort
# ---------------------------------------------------------------------------

@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    q: Optional[str] = Query(None, max_length=200, description="Search by name"),
    include_archived: bool = False,
    status: Optional[ProjectStatus] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    order_by: Literal["name", "created_at", "updated_at"] = "updated_at",
    dir: Literal["asc", "desc"] = "desc",
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    sort_col = _SORT_COLS[order_by]
    sort_fn = asc if dir == "asc" else desc

    base = (
        select(Project)
        .options(joinedload(Project.owner))
        .where(Project.owner_id == current_user.id)
    )
    if not include_archived:
        base = base.where(Project.is_archived.is_(False))
    if status:
        base = base.where(Project.status == status)
    if q:
        base = base.where(Project.name.ilike(f"%{q}%"))

    total_result = await db.execute(select(func.count()).select_from(base.subquery()))
    total: int = total_result.scalar() or 0

    projects_result = await db.execute(
        base.order_by(sort_fn(sort_col))
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    projects = projects_result.scalars().all()

    return ProjectListResponse(
        projects=projects, total=total, page=page, per_page=per_page
    )


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

    await db.commit()
    await db.refresh(project)
    return project


# ---------------------------------------------------------------------------
# #1 — Create from template
# ---------------------------------------------------------------------------

@router.post("/from-template/{template_id}", response_model=ProjectResponse, status_code=201)
async def create_project_from_template(
    template_id: UUID,
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a new project pre-populated from a template.

    Clones all template sections and tasks in a single transaction.
    Task due_dates = project.start_date + timedelta(days=relative_days)
    when start_date is provided and relative_days is set on the template task.
    """
    tmpl_result = await db.execute(
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
    template = tmpl_result.scalars().first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    project = Project(
        **data.model_dump(exclude={"initial_tasks"}),
        owner_id=current_user.id,
    )
    db.add(project)
    await db.flush()  # get project.id

    for tmpl_section in template.sections:
        from app.models.project import Section
        section = Section(
            id=uuid4(),
            name=tmpl_section.name,
            position=tmpl_section.position,
            project_id=project.id,
        )
        db.add(section)
        await db.flush()  # get section.id

        for tmpl_task in tmpl_section.tasks:
            due = None
            if project.start_date and tmpl_task.relative_days is not None:
                due = project.start_date + timedelta(days=tmpl_task.relative_days)

            db.add(Task(
                id=uuid4(),
                title=tmpl_task.title,
                description=tmpl_task.description,
                priority=tmpl_task.priority,
                position=tmpl_task.position,
                due_date=due,
                project_id=project.id,
            ))

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
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
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
    await db.commit()
    await db.refresh(project)
    return project


# ---------------------------------------------------------------------------
# #2 — Members
# ---------------------------------------------------------------------------

@router.post("/{project_id}/members", response_model=MemberResponse, status_code=201)
async def invite_member(
    project_id: UUID,
    body: MemberInvite,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Invite a user to the project (owner or admin only)."""
    project = await _get_accessible_project(
        project_id, current_user, db, required_role=MemberRole.ADMIN
    )
    if project.owner_id != current_user.id:
        # double-check admin membership
        member_check = await db.execute(
            select(ProjectMember).where(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == current_user.id,
                ProjectMember.role == MemberRole.ADMIN,
            )
        )
        if not member_check.scalars().first():
            raise HTTPException(403, "Only project owner or admin can invite members")

    # Prevent inviting the owner
    if body.user_id == project.owner_id:
        raise HTTPException(400, "Project owner cannot be added as a member")

    # Check duplicate
    existing = await db.execute(
        select(ProjectMember).where(
            ProjectMember.project_id == project_id,
            ProjectMember.user_id == body.user_id,
        )
    )
    if existing.scalars().first():
        raise HTTPException(409, "User is already a member of this project")

    member = ProjectMember(
        project_id=project_id,
        user_id=body.user_id,
        role=body.role,
        invited_by=current_user.id,
    )
    db.add(member)
    await db.commit()
    await db.refresh(member)
    return member


@router.get("/{project_id}/members", response_model=List[MemberResponse])
async def list_members(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_accessible_project(project_id, current_user, db)
    result = await db.execute(
        select(ProjectMember)
        .options(joinedload(ProjectMember.user))
        .where(ProjectMember.project_id == project_id)
    )
    return result.scalars().all()


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
    member.role = body.role
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
    await db.delete(member)
    await db.commit()


# ---------------------------------------------------------------------------
# Stats (#7 — unchanged)
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
        .where(Task.project_id == project_id)
        .group_by(Task.status)
    )
    by_status: dict[str, int] = {}
    total = 0
    completed = 0
    for row in status_rows:
        by_status[row.status.value] = row.cnt
        total += row.cnt
        if row.status == TaskStatus.DONE:
            completed = row.cnt

    priority_rows = await db.execute(
        select(Task.priority, func.count(Task.id).label("cnt"))
        .where(Task.project_id == project_id)
        .group_by(Task.priority)
    )
    by_priority: dict[str, int] = {row.priority.value: row.cnt for row in priority_rows}

    overdue_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id == project_id,
            Task.due_date < now,
            Task.status.notin_([TaskStatus.DONE, TaskStatus.ARCHIVED]),
        )
    )
    overdue_count: int = overdue_result.scalar() or 0

    for s in TaskStatus:
        by_status.setdefault(s.value, 0)
    for p in TaskPriority:
        by_priority.setdefault(p.value, 0)

    return {
        "total_tasks": total,
        "completed_tasks": completed,
        "overdue_count": overdue_count,
        "progress": round(completed / total * 100) if total else 0,
        "by_status": by_status,
        "by_priority": by_priority,
    }
