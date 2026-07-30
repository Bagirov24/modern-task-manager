"""Authentication endpoints.

Features
--------
- POST /register  — unique email + username, bcrypt hash, rate-limited.
- POST /login     — timing-safe 401, email lowercase, returns access+refresh.
- POST /refresh   — validates refresh token, issues new pair, blacklists old
                    refresh jti in Redis (true token rotation).
- POST /logout    — blacklists the current access token jti in Redis so it
                    cannot be reused until natural expiry.
- GET  /me        — returns authenticated user profile.
"""
from __future__ import annotations

import logging
from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, status
import jwt
from jwt import PyJWTError as JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, get_redis
from app.core.security import (
    blacklist_token,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.user import (
    PasswordChange,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserPrivateResponse,
    UserUpdate,
)

logger = logging.getLogger(__name__)
router = APIRouter()


def _credentials_error() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


@router.post(
    "/register",
    response_model=UserPrivateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User).where(User.email == user_data.email.lower())
    )
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    result = await db.execute(
        select(User).where(User.username == user_data.username)
    )
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=user_data.email.lower(),
        username=user_data.username,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("New user registered: %s", user.id)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(
    user_data: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    email = user_data.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    if not user or not verify_password(user_data.password, user.hashed_password):
        raise _credentials_error()

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is deactivated")

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    refresh_token: str,
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
):
    """Issue a new token pair and blacklist the old refresh token (rotation)."""
    from app.core.security import is_token_blacklisted
    from datetime import datetime

    credentials_exc = _credentials_error()
    try:
        payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
            leeway=10,
        )
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        jti: str | None = payload.get("jti")
        exp = payload.get("exp")

        if user_id is None or token_type != "refresh" or jti is None:
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    # Reject already-rotated tokens.
    if await is_token_blacklisted(jti, redis):
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise credentials_exc

    # Blacklist old refresh token so it cannot be reused.
    expire_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
    await blacklist_token(jti, expire_dt, redis)

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/logout", status_code=204)
async def logout(
    token: str = Depends(__import__('fastapi').security.OAuth2PasswordBearer(tokenUrl='/api/v1/auth/login')),
    redis=Depends(get_redis),
):
    """Blacklist the current access token jti in Redis."""
    from datetime import datetime

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
            options={"verify_exp": False},
            leeway=10,
        )
        jti = payload.get("jti")
        exp = payload.get("exp")
        user_id = payload.get("sub")
        if jti and exp:
            expire_dt = datetime.fromtimestamp(exp, tz=timezone.utc)
            await blacklist_token(jti, expire_dt, redis)
            logger.info("User %s logged out, token %s blacklisted", user_id, jti)
    except JWTError:
        pass  # Even invalid tokens should get a 204 — don't leak info.


@router.get("/me", response_model=UserPrivateResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user

@router.patch("/profile", response_model=UserPrivateResponse)
async def update_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    updates = data.model_dump(exclude_unset=True)
    username = updates.get("username")
    if username and username != current_user.username:
        result = await db.execute(select(User).where(User.username == username))
        if result.scalars().first():
            raise HTTPException(status_code=400, detail="Username already taken")

    for field, value in updates.items():
        setattr(current_user, field, str(value) if field == "avatar_url" and value else value)

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.post("/change-password", status_code=204)
async def change_password(
    data: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="New password must be different")

    current_user.hashed_password = get_password_hash(data.new_password)
    await db.commit()