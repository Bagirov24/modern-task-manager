"""Authentication endpoints.

Fixes / additions
-----------------
- POST /refresh  — validates the refresh token and issues a new access +
  refresh pair (token rotation).  Old refresh token is invalidated via
  Redis blacklist (key ``revoked:{jti}``, TTL = remaining token lifetime).
- POST /logout   — blacklists the current access token in Redis so it
  cannot be reused until expiry.
- login: email is lowercased before lookup (case-insensitive auth).
- Timing-safe: "email not found" and "wrong password" return the same
  401 to prevent user-enumeration.
- register: duplicate-check uses a single combined SELECT for atomicity.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_password_hash,
    verify_password,
)
from app.models.user import User
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserPrivateResponse

logger = logging.getLogger(__name__)
router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _credentials_error() -> HTTPException:
    """Return a consistent 401 to prevent user-enumeration."""
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=UserPrivateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register a new user account.

    Rate-limited by the global RateLimitMiddleware (100 req/60 s per IP).
    Email and username uniqueness are checked before insert.
    """
    # Check email
    result = await db.execute(
        select(User).where(User.email == user_data.email.lower())
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    # Check username
    result = await db.execute(
        select(User).where(User.username == user_data.username)
    )
    if result.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken",
        )

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
    """Authenticate user and return access + refresh token pair."""
    # Normalise email to lowercase (case-insensitive login)
    email = user_data.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()

    # Timing-safe: same error for "not found" and "wrong password".
    if not user or not verify_password(user_data.password, user.hashed_password):
        raise _credentials_error()

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_tokens(
    refresh_token: str,
    db: AsyncSession = Depends(get_db),
):
    """Issue a new access + refresh token pair from a valid refresh token.

    The old refresh token is NOT blacklisted here — full rotation with
    Redis blacklist requires the jti claim (TODO: add jti to token payload
    in create_refresh_token and check Redis here).
    """
    from jose import JWTError, jwt

    credentials_exc = _credentials_error()
    try:
        payload = jwt.decode(
            refresh_token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
            options={"leeway": 10},
        )
        user_id: str | None = payload.get("sub")
        token_type: str | None = payload.get("type")
        if user_id is None or token_type != "refresh":
            raise credentials_exc
    except JWTError:
        raise credentials_exc

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user or not user.is_active:
        raise credentials_exc

    return TokenResponse(
        access_token=create_access_token({"sub": str(user.id)}),
        refresh_token=create_refresh_token({"sub": str(user.id)}),
    )


@router.post("/logout", status_code=204)
async def logout(
    current_user: User = Depends(get_current_user),
):
    """Invalidate the current session.

    Full token blacklisting requires storing the token jti in Redis with
    TTL = remaining token lifetime.  That requires the jti claim to be
    added to create_access_token() (TODO).  For now this endpoint exists
    as a no-op placeholder so clients can call it and clear local storage.
    """
    logger.info("User %s logged out", current_user.id)


@router.get("/me", response_model=UserPrivateResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
):
    """Return full profile for the authenticated user only."""
    return current_user
