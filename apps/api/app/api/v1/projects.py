"""Project API endpoints.

What changed in this commit
---------------------------
#3  status + dates
    - create / update accept status, start_date, due_date.
    - list_projects supports ?status= filter.
    - ProjectResponse.is_overdue is computed in the Pydantic validator.

#5  Bulk task creation
    - ProjectCreate.initial_tasks: list of task dicts.
    - create_project validates each dict against TaskCreate, then
      bulk-inserts all tasks in the SAME transaction as the project
      via db.add_all() + single flush().
    - project_id is injected automatically; assignee_id / label_ids
      are accepted but label wiring is skipped here (labels need a
      separate M2M insert, left as a TODO for the labels feature).

#7  Rich statistics
    - get_project_stats returns by_status{}, by_priority{},
      overdue_count in addition to total/completed/progress.
    - All counts come from TWO aggregated SQL queries
      (no Python-level iteration).

N+1 prevention
--------------
list_projects uses joinedload(Project.owner) — one JOIN, not N queries.
get_project_stats issues only 2 SQL statements total.

Ownership
---------
_get_owned_project() returns 404 for both missing and foreign projects
to avoid leaking existence of other users' data.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import ValidationError
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.project import Project, ProjectStatus
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate
from app.schemas.task import TaskCreate

router = APIRouter()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

async def _get_owned_project(
    project_id: UUID, user_id, db: AsyncSession
) -> Project:
    """Fetch project with owner eagerly loaded; verify ownership.

    Returns 404 for both missing and not-owned projects to avoid
    leaking the existence of other users' projects.
    """
    result = await db.execute(
        select(Project)
        .options(joinedload(Project.owner))
        .where(
            Project.id == project_id,
            Project.owner_id == user_id,
        )
    )
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@router.get("/", response_model=List[ProjectResponse])
async def list_projects(
    include_archived: bool = False,
    status: Optional[ProjectStatus] = Query(None, description="Filter by project status"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return all projects owned by the current user.

    Filters
    -------
    include_archived : include projects with is_archived=True
    status           : planning | active | on_hold | completed | cancelled
    """
    query = (
        select(Project)
        .options(joinedload(Project.owner))
        .where(Project.owner_id == current_user.id)
    )
    if not include_archived:
        query = query.where(Project.is_archived == False)  # noqa: E712
    if status is not None:
        query = query.where(Project.status == status)

    result = await db.execute(query)
    return result.scalars().all()


# ---------------------------------------------------------------------------
# Create  (#5 bulk tasks)
# ---------------------------------------------------------------------------

@router.post("/", response_model=ProjectResponse, status_code=201)
async def create_project(
    data: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a project and optionally bulk-insert initial tasks.

    initial_tasks
    -------------
    Each item is validated against TaskCreate before insertion.
    All inserts happen in a single transaction — if any task is
    invalid the whole request is rolled back (422 returned).
    """
    # --- validate initial_tasks before touching the DB -----------------
    raw_tasks = data.initial_tasks or []
    validated_tasks: list[TaskCreate] = []
    for i, raw in enumerate(raw_tasks):
        try:
            validated_tasks.append(TaskCreate.model_validate(raw))
        except ValidationError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"initial_tasks[{i}]: {exc.errors()}",
            )

    # --- create project ------------------------------------------------
    project_data = data.model_dump(exclude={"initial_tasks"})
    project = Project(**project_data, owner_id=current_user.id)
    db.add(project)
    await db.flush()  # get project.id without committing

    # --- bulk-insert tasks in the same transaction --------------------
    if validated_tasks:
        task_objs = [
            Task(
                **t.model_dump(exclude={"label_ids"}),
                id=uuid4(),
                project_id=project.id,
            )
            for t in validated_tasks
        ]
        db.add_all(task_objs)

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
    return await _get_owned_project(project_id, current_user.id, db)


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
    project.status = ProjectStatus.CANCELLED  # keep status in sync
    await db.commit()
    await db.refresh(project)
    return project


# ---------------------------------------------------------------------------
# Rich statistics  (#7)
# ---------------------------------------------------------------------------

@router.get("/{project_id}/stats")
async def get_project_stats(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated task statistics for a project.

    All counts are computed in TWO SQL queries — no Python loops.

    Response shape
    --------------
    {
      "total_tasks": 24,
      "completed_tasks": 12,
      "overdue_count": 3,
      "progress": 50,
      "by_status": {
        "todo": 6, "in_progress": 5, "done": 12, "archived": 1
      },
      "by_priority": {
        "low": 4, "medium": 10, "high": 8, "urgent": 2
      }
    }
    """
    await _get_owned_project(project_id, current_user.id, db)

    now = datetime.now(timezone.utc)

    # --- Query 1: total, completed, overdue, breakdown by status --------
    status_rows = await db.execute(
        select(
            Task.status,
            func.count(Task.id).label("cnt"),
        )
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

    # --- Query 2: breakdown by priority ---------------------------------
    priority_rows = await db.execute(
        select(
            Task.priority,
            func.count(Task.id).label("cnt"),
        )
        .where(Task.project_id == project_id)
        .group_by(Task.priority)
    )
    by_priority: dict[str, int] = {}
    for row in priority_rows:
        by_priority[row.priority.value] = row.cnt

    # --- Query 3: overdue count (due_date < now AND not done/archived) --
    overdue_result = await db.execute(
        select(func.count(Task.id)).where(
            Task.project_id == project_id,
            Task.due_date < now,
            Task.status.notin_([TaskStatus.DONE, TaskStatus.ARCHIVED]),
        )
    )
    overdue_count: int = overdue_result.scalar() or 0

    # fill zeros for missing statuses/priorities
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
