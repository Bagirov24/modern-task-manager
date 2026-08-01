from datetime import datetime, timedelta, timezone
from uuid import UUID

import jwt
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import func, inspect, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user, verify_password
from app.models.test_data import TestDataAccessLog, TestDataItem, TestDataSet
from app.models.user import User
from app.schemas.test_data import (
    ReauthenticationRequest, ReauthenticationResponse, TestDataItemCreate,
    TestDataItemResponse, TestDataListResponse, TestDataSetCreate,
    TestDataSetResponse, TestDataSetUpdate,
)
from app.services.access_policy import accessible_project_ids, project_capability, require_project_access

router = APIRouter()


def _reauth_token(user_id: UUID) -> str:
    return jwt.encode({
        "sub": str(user_id), "type": "reauth",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=5),
    }, settings.SECRET_KEY, algorithm="HS256")


def _validate_reauth(token: str | None, user_id: UUID) -> None:
    if not token:
        raise HTTPException(status_code=401, detail="Re-authentication is required for restricted test data")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        if payload.get("type") != "reauth" or payload.get("sub") != str(user_id):
            raise ValueError
    except (jwt.PyJWTError, ValueError):
        raise HTTPException(status_code=401, detail="Re-authentication token is invalid or expired") from None


async def _get_set(db: AsyncSession, set_id: UUID, user: User, *, write: bool = False) -> TestDataSet:
    projects = await accessible_project_ids(db, user.id)
    result = await db.execute(select(TestDataSet).options(selectinload(TestDataSet.items)).where(
        TestDataSet.id == set_id,
        or_(TestDataSet.owner_id == user.id, TestDataSet.project_id.in_(projects)),
    ))
    data_set = result.scalars().unique().first()
    if not data_set:
        raise HTTPException(status_code=404, detail="Test data set not found")
    if write and data_set.owner_id != user.id:
        await require_project_access(db, data_set.project_id, user.id, write=True)
    return data_set


def _response(data_set: TestDataSet, include_items: bool) -> TestDataSetResponse:
    payload = {
        column.name: getattr(data_set, column.name)
        for column in TestDataSet.__table__.columns
    }
    items = [] if "items" in inspect(data_set).unloaded else list(data_set.items)
    payload["items"] = items if include_items else []
    return TestDataSetResponse.model_validate(payload)

@router.post("/reauth", response_model=ReauthenticationResponse)
async def reauthenticate(data: ReauthenticationRequest, current_user: User = Depends(get_current_user)):
    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(status_code=401, detail="Password is incorrect")
    return ReauthenticationResponse(reauth_token=_reauth_token(current_user.id))


@router.get("/sets", response_model=TestDataListResponse)
async def list_sets(
    environment: str | None = None, sensitivity: str | None = None,
    project_id: UUID | None = None, include_production: bool = False,
    page: int = Query(1, ge=1), per_page: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    projects = await accessible_project_ids(db, current_user.id)
    query = select(TestDataSet).options(selectinload(TestDataSet.items)).where(
        or_(TestDataSet.owner_id == current_user.id, TestDataSet.project_id.in_(projects))
    )
    if not include_production:
        query = query.where(TestDataSet.environment != "production")
    if environment:
        query = query.where(TestDataSet.environment == environment)
    if sensitivity:
        query = query.where(TestDataSet.sensitivity == sensitivity)
    if project_id:
        query = query.where(TestDataSet.project_id == project_id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar_one()
    rows = (await db.execute(query.order_by(TestDataSet.updated_at.desc()).offset((page - 1) * per_page).limit(per_page))).scalars().unique().all()
    visible = []
    for row in rows:
        capability = await project_capability(db, row.project_id, current_user.id)
        if row.environment == "production" and capability != "project_admin":
            continue
        visible.append(_response(row, include_items=row.sensitivity != "restricted"))
    return TestDataListResponse(data_sets=visible, total=total, page=page, per_page=per_page)


@router.post("/sets", response_model=TestDataSetResponse, status_code=201)
async def create_set(data: TestDataSetCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await require_project_access(db, data.project_id, current_user.id, write=True)
    capability = await project_capability(db, data.project_id, current_user.id)
    if (data.environment == "production" or data.sensitivity == "restricted") and capability != "project_admin":
        raise HTTPException(status_code=403, detail="Project admin access required")
    data_set = TestDataSet(**data.model_dump(), owner_id=current_user.id)
    db.add(data_set)
    await db.commit()
    await db.refresh(data_set)
    return _response(data_set, include_items=True)


@router.get("/sets/{set_id}", response_model=TestDataSetResponse)
async def get_set(
    set_id: UUID, x_reauth_token: str | None = Header(None),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    data_set = await _get_set(db, set_id, current_user)
    if data_set.sensitivity == "restricted":
        _validate_reauth(x_reauth_token, current_user.id)
    return _response(data_set, include_items=True)


@router.patch("/sets/{set_id}", response_model=TestDataSetResponse)
async def update_set(
    set_id: UUID, data: TestDataSetUpdate, x_reauth_token: str | None = Header(None),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    data_set = await _get_set(db, set_id, current_user, write=True)
    if data_set.sensitivity == "restricted":
        _validate_reauth(x_reauth_token, current_user.id)
    update = data.model_dump(exclude_unset=True)
    capability = await project_capability(db, data_set.project_id, current_user.id)
    if (update.get("environment") == "production" or update.get("sensitivity") == "restricted") and capability != "project_admin":
        raise HTTPException(status_code=403, detail="Project admin access required")
    for field, value in update.items():
        setattr(data_set, field, value)
    await db.commit()
    return await _get_set(db, set_id, current_user)


@router.post("/sets/{set_id}/items", response_model=TestDataItemResponse, status_code=201)
async def create_item(
    set_id: UUID, data: TestDataItemCreate, request: Request,
    x_reauth_token: str | None = Header(None), db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data_set = await _get_set(db, set_id, current_user, write=True)
    if data_set.sensitivity == "restricted":
        _validate_reauth(x_reauth_token, current_user.id)
    capability = await project_capability(db, data_set.project_id, current_user.id)
    if data.vault_reference and capability not in {"developer", "project_admin"}:
        raise HTTPException(status_code=403, detail="Developer access required for vault references")
    item = TestDataItem(test_data_set_id=set_id, **data.model_dump())
    db.add(item)
    await db.flush()
    db.add(TestDataAccessLog(
        test_data_item_id=item.id, user_id=current_user.id, action="create",
        ip_address=request.client.host if request.client else None,
    ))
    await db.commit()
    await db.refresh(item)
    return item


@router.get("/items/{item_id}", response_model=TestDataItemResponse)
async def get_item(
    item_id: UUID, request: Request, x_reauth_token: str | None = Header(None),
    db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user),
):
    item = (await db.execute(select(TestDataItem).where(TestDataItem.id == item_id))).scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Test data item not found")
    data_set = await _get_set(db, item.test_data_set_id, current_user)
    if data_set.sensitivity == "restricted":
        _validate_reauth(x_reauth_token, current_user.id)
    capability = await project_capability(db, data_set.project_id, current_user.id)
    response = TestDataItemResponse.model_validate(item)
    if capability == "viewer":
        response.vault_reference = None
    if data_set.sensitivity == "restricted":
        response.watermark = f"{current_user.email} · {datetime.now(timezone.utc).isoformat(timespec='seconds')}"
    db.add(TestDataAccessLog(
        test_data_item_id=item.id, user_id=current_user.id, action="view",
        ip_address=request.client.host if request.client else None,
    ))
    await db.commit()
    return response


@router.get("/audit", response_model=list[dict])
async def audit_log(
    project_id: UUID | None = None, db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if await project_capability(db, project_id, current_user.id) != "project_admin":
        raise HTTPException(status_code=403, detail="Project admin access required")
    query = select(TestDataAccessLog, TestDataItem.label).join(TestDataItem)
    if project_id:
        query = query.join(TestDataSet).where(TestDataSet.project_id == project_id)
    rows = (await db.execute(query.order_by(TestDataAccessLog.created_at.desc()).limit(200))).all()
    return [{
        "id": str(log.id), "item_id": str(log.test_data_item_id), "item_label": label,
        "user_id": str(log.user_id), "action": log.action,
        "ip_address": log.ip_address, "created_at": log.created_at.isoformat(),
    } for log, label in rows]
