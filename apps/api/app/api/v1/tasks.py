"""Task API endpoints.

N+1 prevention
--------------
_base_query() uses joinedload for assignee, project, and labels in a
single SQL JOIN.  Comments are loaded via selectinload (separate query)
to avoid a Cartesian-product explosion when both labels and comments are
joined simultaneously.

Ownership enforcement
---------------------
All mutating endpoints (PATCH, DELETE) verify Task.assignee_id ==
current_user.id before touching the row.
"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User
from app.schemas.task import TaskCreate, TaskListResponse, TaskResponse, TaskUpdate

router = APIRouter()

_WORKFLOW_TO_LEGACY = {
    "inbox": TaskStatus.TODO,
    "backlog": TaskStatus.TODO,
    "clarification_needed": TaskStatus.TODO,
    "planned": TaskStatus.TODO,
    "ready": TaskStatus.TODO,
    "in_progress": TaskStatus.IN_PROGRESS,
    "waiting_for_internal": TaskStatus.IN_PROGRESS,
    "waiting_for_client": TaskStatus.IN_PROGRESS,
    "review": TaskStatus.IN_PROGRESS,
    "ready_to_send": TaskStatus.IN_PROGRESS,
    "done": TaskStatus.DONE,
    "cancelled": TaskStatus.ARCHIVED,
    "blocked": TaskStatus.IN_PROGRESS,
}
_LEGACY_TO_WORKFLOW = {
    TaskStatus.TODO: "backlog",
    TaskStatus.IN_PROGRESS: "in_progress",
    TaskStatus.DONE: "done",
    TaskStatus.ARCHIVED: "cancelled",
}


def _ensure_ready(values: dict) -> None:
    if values.get("workflow_status") != "ready":
        return
    required = ("context", "expected_result", "acceptance_criteria", "assignee_id", "project_id")
    missing = [field for field in required if not values.get(field)]
    if missing:
        raise HTTPException(status_code=422, detail={
            "code": "incomplete_planning",
            "message": "Неполная постановка",
            "missing_fields": missing,
        })


def _base_query(user_id):
    """Base select with eager-loaded relations to prevent N+1 queries.

    - joinedload(assignee):  user row — needed for UserPublicResponse.
    - joinedload(project):   project row — needed for nested project info.
    - joinedload(labels):    many-to-many via task_labels association table.
    - selectinload(subtasks): child tasks — separate query avoids cartesian
      product with labels.
    """
    return (
        select(Task)
        .options(
            joinedload(Task.assignee),
            joinedload(Task.project),
            joinedload(Task.labels),
            selectinload(Task.subtasks),
        )
        .where(Task.assignee_id == user_id)
    )


@router.get("/", response_model=TaskListResponse)
async def list_tasks(
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    project_id: Optional[UUID] = None,
    # max_length guard prevents DoS via huge search strings
    search: Optional[str] = Query(None, max_length=200),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = _base_query(current_user.id)
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if project_id:
        query = query.where(Task.project_id == project_id)
    if search:
        query = query.where(Task.title.ilike(f"%{search}%"))

    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    result = await db.execute(query.offset((page - 1) * per_page).limit(per_page))
    tasks = result.scalars().unique().all()
    return TaskListResponse(tasks=tasks, total=total, page=page, per_page=per_page)


@router.post("/", response_model=TaskResponse, status_code=201)
async def create_task(
    task_data: TaskCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    values = task_data.model_dump(exclude={"label_ids"})
    assignee_id = values.pop("assignee_id") or current_user.id
    if assignee_id != current_user.id:
        raise HTTPException(status_code=403, detail="Assigning another user is not available in personal scope")
    values["assignee_id"] = assignee_id
    values["manager_id"] = values.get("manager_id") or current_user.id
    values["final_due_at"] = values.get("final_due_at") or values.get("due_date")
    values["next_action_description"] = values.get("next_action_description") or values.get("next_action")
    values["next_action"] = values.get("next_action") or values.get("next_action_description")
    values["next_action_owner_id"] = values.get("next_action_owner_id") or current_user.id
    if values["workflow_status"] == "blocked":
        values["is_blocked"] = True
    values["status"] = _WORKFLOW_TO_LEGACY.get(values["workflow_status"], values["status"])
    _ensure_ready(values)
    task = Task(**values)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        _base_query(current_user.id).where(Task.id == task_id)
    )
    task = result.scalars().unique().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.patch("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: UUID,
    task_data: TaskUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.assignee_id == current_user.id,
        )
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = task_data.model_dump(exclude_unset=True)
    if "workflow_status" in update_data:
        update_data["status"] = _WORKFLOW_TO_LEGACY[update_data["workflow_status"]]
        if update_data["workflow_status"] == "blocked":
            update_data["is_blocked"] = True
    elif "status" in update_data:
        update_data["workflow_status"] = _LEGACY_TO_WORKFLOW[update_data["status"]]
    prospective = {
        field: update_data.get(field, getattr(task, field, None))
        for field in ("workflow_status", "context", "expected_result", "acceptance_criteria", "assignee_id", "project_id")
    }
    _ensure_ready(prospective)
    if update_data.get("is_blocked") and not update_data.get("blocked_reason", task.blocked_reason):
        raise HTTPException(status_code=422, detail="Blocked tasks require a reason")
    if update_data.get("is_blocked") is False:
        update_data["blocked_reason"] = None
        update_data["blocked_by_task_id"] = None
    if "status" in update_data and update_data["status"] == TaskStatus.DONE:
        update_data["completed_at"] = datetime.now(timezone.utc)
    if "due_date" in update_data and "final_due_at" not in update_data:
        update_data["final_due_at"] = update_data["due_date"]
    if "next_action" in update_data and "next_action_description" not in update_data:
        update_data["next_action_description"] = update_data["next_action"]
    if "next_action_description" in update_data and "next_action" not in update_data:
        update_data["next_action"] = update_data["next_action_description"]
    update_data["last_activity_at"] = datetime.now(timezone.utc)

    for field, value in update_data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(
    task_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Task).where(
            Task.id == task_id,
            Task.assignee_id == current_user.id,
        )
    )
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    await db.delete(task)
    await db.commit()
