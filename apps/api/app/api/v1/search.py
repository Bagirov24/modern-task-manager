
from fastapi import APIRouter, Depends, Query
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.sensitive_data import scan_sensitive_text
from app.models.comment import Comment
from app.models.document import Document, DocumentAttachment, DocumentLink
from app.models.project import Project
from app.models.task import Task
from app.models.test_data import TestDataSet
from app.models.user import User
from app.services.access_policy import accessible_project_ids

router = APIRouter()


def _snippet(value: str | None) -> str:
    if not value:
        return ""
    if scan_sensitive_text(value):
        return "Контекст скрыт политикой безопасности"
    return " ".join(value.split())[:180]


@router.get("/")
async def global_search(
    q: str = Query(..., min_length=2, max_length=200),
    limit: int = Query(8, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    pattern = f"%{q}%"
    project_ids = await accessible_project_ids(db, current_user.id)
    results: list[dict] = []

    projects = (await db.execute(
        select(Project).where(
            Project.id.in_(project_ids),
            or_(Project.name.ilike(pattern), Project.description.ilike(pattern)),
        ).limit(limit)
    )).scalars().all()
    results.extend({
        "type": "project", "id": str(item.id), "title": item.name,
        "path": item.name, "context": _snippet(item.description),
        "status": item.status.value, "updated_at": item.updated_at.isoformat(),
        "url": f"/projects/{item.id}",
    } for item in projects)

    tasks = (await db.execute(
        select(Task, Project.name).outerjoin(Project).where(
            or_(Task.assignee_id == current_user.id, Task.project_id.in_(project_ids)),
            or_(Task.title.ilike(pattern), Task.description.ilike(pattern), Task.context.ilike(pattern)),
        ).limit(limit)
    )).all()
    results.extend({
        "type": "task", "id": str(item.id), "title": item.title,
        "path": " → ".join(filter(None, (project_name, item.title))),
        "context": _snippet(item.context or item.description),
        "status": item.workflow_status, "updated_at": item.updated_at.isoformat(),
        "url": f"/tasks?task={item.id}",
    } for item, project_name in tasks)

    documents = (await db.execute(
        select(Document, Project.name).outerjoin(Project).where(
            Document.archived_at.is_(None),
            or_(Document.owner_id == current_user.id, Document.project_id.in_(project_ids)),
            or_(Document.title.ilike(pattern), Document.content_markdown.ilike(pattern)),
        ).limit(limit)
    )).all()
    results.extend({
        "type": "document", "id": str(item.id), "title": item.title,
        "path": " → ".join(filter(None, (project_name, item.title))),
        "context": _snippet(item.content_markdown), "status": item.status,
        "updated_at": item.updated_at.isoformat(), "url": f"/documents?document={item.id}",
    } for item, project_name in documents)

    comments = (await db.execute(
        select(Comment, Task.title).join(Task).where(
            or_(Task.assignee_id == current_user.id, Task.project_id.in_(project_ids)),
            Comment.content.ilike(pattern),
        ).limit(limit)
    )).all()
    results.extend({
        "type": "comment", "id": str(item.id), "title": task_title,
        "path": task_title, "context": _snippet(item.content), "status": None,
        "updated_at": item.updated_at.isoformat(), "url": f"/tasks?task={item.task_id}",
    } for item, task_title in comments)

    data_sets = (await db.execute(
        select(TestDataSet, Project.name).outerjoin(Project).where(
            TestDataSet.environment != "production",
            or_(TestDataSet.owner_id == current_user.id, TestDataSet.project_id.in_(project_ids)),
            or_(TestDataSet.name.ilike(pattern), TestDataSet.description.ilike(pattern)),
        ).limit(limit)
    )).all()
    results.extend({
        "type": "test_data", "id": str(item.id), "title": item.name,
        "path": " → ".join(filter(None, (project_name, item.environment, item.name))),
        "context": _snippet(item.description), "status": item.sensitivity,
        "updated_at": item.updated_at.isoformat(), "url": f"/test-data?set={item.id}",
    } for item, project_name in data_sets)

    attachment_rows = (await db.execute(
        select(DocumentAttachment, Document.title).join(Document).where(
            or_(Document.owner_id == current_user.id, Document.project_id.in_(project_ids)),
            DocumentAttachment.original_name.ilike(pattern),
        ).limit(limit)
    )).all()
    results.extend({
        "type": "attachment", "id": str(item.id), "title": item.original_name,
        "path": document_title, "context": item.mime_type, "status": None,
        "updated_at": item.created_at.isoformat(), "url": f"/documents?document={item.document_id}",
    } for item, document_title in attachment_rows)

    link_rows = (await db.execute(
        select(DocumentLink, Document.title).join(Document).where(
            or_(Document.owner_id == current_user.id, Document.project_id.in_(project_ids)),
            or_(DocumentLink.title.ilike(pattern), DocumentLink.url.ilike(pattern)),
        ).limit(limit)
    )).all()
    results.extend({
        "type": "link", "id": str(item.id), "title": item.title,
        "path": document_title, "context": _snippet(item.url), "status": item.link_type,
        "updated_at": None, "url": f"/documents?document={item.document_id}",
    } for item, document_title in link_rows)

    results.sort(key=lambda item: item.get("updated_at") or "", reverse=True)
    return {"query": q, "results": results[: limit * 4], "total": len(results)}
