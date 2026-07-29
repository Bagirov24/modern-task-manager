"""Authentication helpers: password hashing and JWT token management.

Security decisions
------------------
* JWT algorithm is hard-coded to ["HS256"] — it is NOT read from settings.
  This prevents algorithm-confusion attacks (alg:none / RS256 confusion).
* Every token carries a ``jti`` (JWT ID) claim — a UUID unique per token.
  On logout/refresh the jti is written to Redis with TTL = remaining token
  lifetime, so the token cannot be reused even before it expires.
* ``leeway=10`` seconds tolerates minor clock skew without opening a large
  replay window.
* Token expiry (exp claim) is always set and never optional.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Optional
from uuid import uuid4

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import jwt
from jwt import PyJWTError as JWTError
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db, get_redis
from app.models.user import User

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
_JWT_ALGORITHMS = ["HS256"]  # Hard-coded — never let callers override.

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ---------------------------------------------------------------------------
# Password helpers
# ---------------------------------------------------------------------------

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a signed JWT access token with jti + type claims."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "jti": str(uuid4()),   # unique token ID — used for blacklisting
        "type": "access",
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


def create_refresh_token(data: dict) -> str:
    """Create a signed JWT refresh token with jti + type claims."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    to_encode.update({
        "exp": expire,
        "jti": str(uuid4()),   # unique token ID — used for rotation blacklist
        "type": "refresh",
    })
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")


# ---------------------------------------------------------------------------
# Redis blacklist helpers
# ---------------------------------------------------------------------------

_BLACKLIST_PREFIX = "revoked:"


async def blacklist_token(jti: str, expire: datetime, redis) -> None:
    """Add a token jti to the Redis blacklist until it expires."""
    now = datetime.now(timezone.utc)
    ttl = max(int((expire - now).total_seconds()), 1)
    await redis.setex(f"{_BLACKLIST_PREFIX}{jti}", ttl, "1")


async def is_token_blacklisted(jti: str, redis) -> bool:
    return await redis.exists(f"{_BLACKLIST_PREFIX}{jti}") > 0


# ---------------------------------------------------------------------------
# FastAPI dependency
# ---------------------------------------------------------------------------

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
    redis=Depends(get_redis),
) -> User:
    """Validate the Bearer token, check Redis blacklist, return the User."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=_JWT_ALGORITHMS,
            leeway=10,
        )
        user_id: str | None = payload.get("sub")
        jti: str | None = payload.get("jti")
        token_type: str | None = payload.get("type")

        if user_id is None or jti is None or token_type != "access":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Check Redis blacklist — token may be revoked via logout.
    if await is_token_blacklisted(jti, redis):
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
    return user
