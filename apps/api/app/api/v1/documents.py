from __future__ import annotations

import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.object_storage import create_download_token, store_upload, storage_path, validate_download_token
from app.core.security import get_current_user
from app.models.document import Document, DocumentAttachment, DocumentLink, DocumentVersion
from app.models.task import Task
from app.models.user import User
from app.schemas.document import (
    DocumentAttachmentResponse, DocumentCreate, DocumentLinkCreate, DocumentLinkResponse,
    DocumentListResponse, DocumentResponse, DocumentRestoreRequest, DocumentUpdate,
    DocumentVersionResponse,
)
from app.services.access_policy import accessible_project_ids, require_project_access

router = APIRouter()


def _slug(value: str) -> str:
    result = re.sub(r"[^a-z0-9а-яё]+", "-", value.lower(), flags=re.IGNORECASE).strip("-")
    return result[:500] or "document"


def _document_query():
    return select(Document).options(selectinload(Document.links), selectinload(Document.attachments))


async def _get_document(db: AsyncSession, document_id: UUID, user: User, *, write: bool = False) -> Document:
    projects = await accessible_project_ids(db, user.id)
    result = await db.execute(_document_query().where(
        Document.id == document_id,
        or_(Document.owner_id == user.id, Document.project_id.in_(projects)),
    ))
    document = result.scalars().unique().first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if write and document.owner_id != user.id:
        await require_project_access(db, document.project_id, user.id, write=True)
    return document


async def _task_project(db: AsyncSession, task_id: UUID | None, user: User) -> UUID | None:
    if task_id is None:
        return None
    task = (await db.execute(select(Task).where(Task.id == task_id))).scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.assignee_id != user.id:
        await require_project_access(db, task.project_id, user.id)
    return task.project_id


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    project_id: UUID | None = None, task_id: UUID | None = None,
    document_type: str | None = None, search: str | None = Query(None, max_length=200),
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    projects = await accessible_project_ids(db, current_user.id)
    query = _document_query().where(
        Document.archived_at.is_(None),
        or_(Document.owner_id == current_user.id, Document.project_id.in_(projects)),
    )
    if project_id:
        query = query.where(Document.project_id == project_id)
    if task_id:
        query = query.where(Document.task_id == task_id)
    if document_type:
        query = query.where(Document.document_type == document_type)
    if search:
        query = query.where(or_(Document.title.ilike(f"%{search}%"), Document.content_markdown.ilike(f"%{search}%")))
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    result = await db.execute(query.order_by(Document.updated_at.desc()).offset((page - 1) * per_page).limit(per_page))
    return DocumentListResponse(documents=result.scalars().unique().all(), total=total, page=page, per_page=per_page)


@router.post("/", response_model=DocumentResponse, status_code=201)
async def create_document(data: DocumentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    task_project_id = await _task_project(db, data.task_id, current_user)
    project_id = data.project_id or task_project_id
    if data.project_id and task_project_id and data.project_id != task_project_id:
        raise HTTPException(status_code=422, detail="Task and document project must match")
    await require_project_access(db, project_id, current_user.id, write=True)
    document = Document(
        **data.model_dump(exclude={"slug", "project_id"}), project_id=project_id,
        slug=data.slug or _slug(data.title), owner_id=current_user.id,
    )
    db.add(document)
    await db.flush()
    db.add(DocumentVersion(
        document_id=document.id, version=1, content_markdown=document.content_markdown,
        changed_by=current_user.id, change_summary="Initial version",
    ))
    await db.commit()
    return await _get_document(db, document.id, current_user)


@router.post("/attachments/{attachment_id}/signed-url")
async def signed_download(attachment_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    attachment = (await db.execute(select(DocumentAttachment).where(DocumentAttachment.id == attachment_id))).scalars().first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    await _get_document(db, attachment.document_id, current_user)
    token = create_download_token(attachment.id, current_user.id)
    return {"url": f"/api/v1/documents/attachments/{attachment.id}/download?token={token}", "expires_in": 300}


@router.get("/attachments/{attachment_id}/download", include_in_schema=False)
async def download_attachment(attachment_id: UUID, token: str, db: AsyncSession = Depends(get_db)):
    user_id = validate_download_token(token, attachment_id)
    attachment = (await db.execute(select(DocumentAttachment).where(DocumentAttachment.id == attachment_id))).scalars().first()
    if not attachment:
        raise HTTPException(status_code=404, detail="Attachment not found")
    projects = await accessible_project_ids(db, user_id)
    allowed = (await db.execute(select(Document.id).where(
        Document.id == attachment.document_id,
        or_(Document.owner_id == user_id, Document.project_id.in_(projects)),
    ))).scalar_one_or_none()
    path = storage_path(attachment.storage_key)
    if not allowed or not path.exists():
        raise HTTPException(status_code=404, detail="Attachment not found")
    return FileResponse(path, filename=attachment.original_name, media_type=attachment.mime_type)


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(document_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    return await _get_document(db, document_id, current_user)


@router.patch("/{document_id}", response_model=DocumentResponse)
async def update_document(document_id: UUID, data: DocumentUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = await _get_document(db, document_id, current_user, write=True)
    if data.expected_version and data.expected_version != document.version:
        raise HTTPException(status_code=409, detail="Document was updated by another user")
    update = data.model_dump(exclude_unset=True, exclude={"change_summary", "expected_version"})
    if "project_id" in update:
        await require_project_access(db, update["project_id"], current_user.id, write=True)
    content_changed = "content_markdown" in update and update["content_markdown"] != document.content_markdown
    for field, value in update.items():
        setattr(document, field, value)
    if "title" in update:
        document.slug = _slug(document.title)
    if content_changed:
        document.version += 1
        db.add(DocumentVersion(
            document_id=document.id, version=document.version, content_markdown=document.content_markdown,
            changed_by=current_user.id, change_summary=data.change_summary,
        ))
    document.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return await _get_document(db, document.id, current_user)


@router.delete("/{document_id}", status_code=204)
async def archive_document(document_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = await _get_document(db, document_id, current_user, write=True)
    document.archived_at = datetime.now(timezone.utc)
    await db.commit()


@router.get("/{document_id}/versions", response_model=list[DocumentVersionResponse])
async def list_versions(document_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_document(db, document_id, current_user)
    result = await db.execute(select(DocumentVersion).where(DocumentVersion.document_id == document_id).order_by(DocumentVersion.version.desc()))
    return result.scalars().all()


@router.post("/{document_id}/versions/{version}/restore", response_model=DocumentResponse)
async def restore_version(document_id: UUID, version: int, data: DocumentRestoreRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    document = await _get_document(db, document_id, current_user, write=True)
    source = (await db.execute(select(DocumentVersion).where(DocumentVersion.document_id == document_id, DocumentVersion.version == version))).scalars().first()
    if not source:
        raise HTTPException(status_code=404, detail="Document version not found")
    document.content_markdown = source.content_markdown
    document.version += 1
    db.add(DocumentVersion(
        document_id=document.id, version=document.version, content_markdown=document.content_markdown,
        changed_by=current_user.id, change_summary=data.change_summary,
    ))
    await db.commit()
    return await _get_document(db, document.id, current_user)


@router.post("/{document_id}/links", response_model=DocumentLinkResponse, status_code=201)
async def add_link(document_id: UUID, data: DocumentLinkCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_document(db, document_id, current_user, write=True)
    link = DocumentLink(document_id=document_id, **data.model_dump())
    db.add(link)
    await db.commit()
    await db.refresh(link)
    return link


@router.post("/{document_id}/attachments", response_model=DocumentAttachmentResponse, status_code=201)
async def upload_attachment(document_id: UUID, file: UploadFile = File(...), db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await _get_document(db, document_id, current_user, write=True)
    key, size, checksum = await store_upload(file, current_user.id)
    attachment = DocumentAttachment(
        document_id=document_id, storage_key=key, original_name=(file.filename or "attachment")[:500],
        mime_type=file.content_type or "application/octet-stream", size_bytes=size,
        checksum=checksum, uploaded_by=current_user.id,
    )
    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)
    return attachment
