from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from sqlalchemy import create_engine
from app.core.config import settings


class Base(DeclarativeBase):
    pass


def _make_async_url(url: str) -> str:
    """Convert sync postgres:// URL to async postgresql+asyncpg:// URL."""
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    return url


def _make_sync_url(url: str) -> str:
    """Strip asyncpg driver from URL for sync (Celery) usage."""
    return (
        url.replace("postgresql+asyncpg://", "postgresql://", 1)
        .replace("postgres+asyncpg://", "postgresql://", 1)
    )


# ---------------------------------------------------------------------------
# Async engine — used by FastAPI request handlers
# ---------------------------------------------------------------------------
engine = create_async_engine(
    _make_async_url(settings.DATABASE_URL),
    # Never echo SQL — bound parameters may contain PII / secrets.
    # To trace queries locally set the sqlalchemy.engine logger to DEBUG.
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
# Sync engine — used ONLY by Celery workers (no asyncio event loop)
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
