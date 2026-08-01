"""Development object storage adapter with short-lived signed downloads."""
from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import UUID, uuid4

import jwt
from fastapi import HTTPException, UploadFile

from app.core.config import settings
from app.core.sensitive_data import SensitiveDataError, ensure_safe_text

_TEXT_TYPES = {"text/plain", "text/markdown", "application/json", "application/xml", "text/csv"}


def _root() -> Path:
    root = Path(settings.OBJECT_STORAGE_DIR).resolve()
    root.mkdir(parents=True, exist_ok=True)
    return root


async def store_upload(file: UploadFile, owner_id: UUID) -> tuple[str, int, str]:
    key = f"{owner_id}/{uuid4().hex}"
    path = _root() / key
    path.parent.mkdir(parents=True, exist_ok=True)
    checksum = hashlib.sha256()
    size = 0
    text_chunks: list[bytes] = []
    try:
        with path.open("xb") as destination:
            while chunk := await file.read(64 * 1024):
                size += len(chunk)
                if size > settings.ATTACHMENT_MAX_BYTES:
                    raise HTTPException(status_code=413, detail="Attachment is too large")
                checksum.update(chunk)
                destination.write(chunk)
                if file.content_type in _TEXT_TYPES:
                    text_chunks.append(chunk)
        if text_chunks:
            ensure_safe_text(b"".join(text_chunks).decode("utf-8", errors="replace"))
    except SensitiveDataError as exc:
        path.unlink(missing_ok=True)
        raise HTTPException(status_code=422, detail=str(exc)) from None
    except Exception:
        path.unlink(missing_ok=True)
        raise
    return key, size, checksum.hexdigest()


def create_download_token(attachment_id: UUID, user_id: UUID, minutes: int = 5) -> str:
    payload = {
        "sub": str(user_id), "attachment_id": str(attachment_id),
        "type": "attachment_download",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=minutes),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")


def validate_download_token(token: str, attachment_id: UUID) -> UUID:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "attachment_download" or payload.get("attachment_id") != str(attachment_id):
            raise ValueError
        return UUID(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        raise HTTPException(status_code=401, detail="Download link is invalid or expired") from None


def storage_path(storage_key: str) -> Path:
    root = _root()
    path = (root / storage_key).resolve()
    if root not in path.parents:
        raise HTTPException(status_code=404, detail="Attachment not found")
    return path
