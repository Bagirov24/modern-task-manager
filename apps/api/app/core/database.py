"""Database engine + session factory.

Provides:
- ``engine`` / ``get_db``  — async SQLAlchemy session for FastAPI handlers.
- ``get_redis``             — aioredis client FastAPI dependency (singleton).
- ``SyncSessionLocal``      — sync session used only by Celery workers.

Connection pool is tuned for a typical single-node production deployment:
  pool_size=20 handles ~20 concurrent DB connections without blocking;
  max_overflow=10 allows brief bursts up to 30 total connections.
  pool_pre_ping=True drops stale connections after DB restart.
"""
from __future__ import annotations

from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _make_async_url(url: str) -> str:
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


def _make_sync_url(url: str) -> str:
    return (
        url.replace("postgresql+asyncpg://", "postgresql://", 1)
           .replace("postgres+asyncpg://", "postgresql://", 1)
    )


# ---------------------------------------------------------------------------
# Async engine — FastAPI request handlers
# ---------------------------------------------------------------------------
engine = create_async_engine(
    _make_async_url(settings.DATABASE_URL),
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
)

AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_db():
    """FastAPI dependency: yields an async database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise


# ---------------------------------------------------------------------------
# Redis — aioredis singleton
# ---------------------------------------------------------------------------

_redis_client = None


async def _get_redis_client():
    """Lazy singleton: create aioredis connection pool once."""
    global _redis_client
    if _redis_client is None:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def get_redis():
    """FastAPI dependency: yields an aioredis client."""
    client = await _get_redis_client()
    yield client


# ---------------------------------------------------------------------------
# Sync engine — Celery workers only (no asyncio event loop)
# ---------------------------------------------------------------------------
_sync_engine = create_engine(
    _make_sync_url(settings.DATABASE_URL),
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=2,
)

SyncSessionLocal: sessionmaker = sessionmaker(
    _sync_engine,
    class_=Session,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)
