import time
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from redis import asyncio as aioredis

from app.core.database import get_db
from app.core.config import settings

router = APIRouter(tags=["health"])
logger = logging.getLogger(__name__)

START_TIME = time.time()


async def _require_internal(x_internal_token: str = Header(default=None)):
    """
    Guard for sensitive health endpoints.
    Returns 404 (not 401) to avoid advertising the endpoint's existence.
    """
    if not settings.INTERNAL_HEALTH_TOKEN or x_internal_token != settings.INTERNAL_HEALTH_TOKEN:
        raise HTTPException(status_code=404, detail="Not found")


@router.get("/health")
async def health_check():
    """Public liveness probe — no sensitive data."""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "version": "1.0.0",
    }


@router.get("/health/db", dependencies=[Depends(_require_internal)])
async def health_db(db: AsyncSession = Depends(get_db)):
    """Internal DB probe — requires X-Internal-Token header."""
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        return {"status": "healthy", "database": "connected"}
    except Exception as exc:
        logger.error("DB health check failed: %s", exc, exc_info=True)
        return {"status": "unhealthy", "database": "connection failed"}


@router.get("/health/redis", dependencies=[Depends(_require_internal)])
async def health_redis():
    """Internal Redis probe — requires X-Internal-Token header."""
    try:
        redis = aioredis.from_url(settings.REDIS_URL)
        await redis.ping()
        await redis.aclose()
        return {"status": "healthy", "redis": "connected"}
    except Exception as exc:
        logger.error("Redis health check failed: %s", exc, exc_info=True)
        return {"status": "unhealthy", "redis": "connection failed"}


@router.get("/health/ready", dependencies=[Depends(_require_internal)])
async def readiness(db: AsyncSession = Depends(get_db)):
    """Internal readiness probe — requires X-Internal-Token header."""
    checks: dict = {}
    healthy = True

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as exc:
        logger.error("Readiness DB check failed: %s", exc, exc_info=True)
        checks["database"] = "fail"
        healthy = False

    try:
        redis = aioredis.from_url(settings.REDIS_URL)
        await redis.ping()
        await redis.aclose()
        checks["redis"] = "ok"
    except Exception as exc:
        logger.error("Readiness Redis check failed: %s", exc, exc_info=True)
        checks["redis"] = "fail"
        healthy = False

    return {
        "status": "ready" if healthy else "not_ready",
        "checks": checks,
    }
