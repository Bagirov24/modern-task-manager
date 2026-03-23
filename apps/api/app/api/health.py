import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from redis import asyncio as aioredis

from app.core.database import get_db
from app.core.config import settings

router = APIRouter(tags=["health"])

START_TIME = time.time()


@router.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "uptime_seconds": round(time.time() - START_TIME, 1),
        "version": "1.0.0",
    }


@router.get("/health/db")
async def health_db(db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(text("SELECT 1"))
        result.scalar()
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "database": str(e)}


@router.get("/health/redis")
async def health_redis():
    try:
        redis = aioredis.from_url(settings.REDIS_URL)
        await redis.ping()
        await redis.aclose()
        return {"status": "healthy", "redis": "connected"}
    except Exception as e:
        return {"status": "unhealthy", "redis": str(e)}


@router.get("/health/ready")
async def readiness(db: AsyncSession = Depends(get_db)):
    checks = {}
    healthy = True

    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "fail"
        healthy = False

    try:
        redis = aioredis.from_url(settings.REDIS_URL)
        await redis.ping()
        await redis.aclose()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "fail"
        healthy = False

    return {
        "status": "ready" if healthy else "not_ready",
        "checks": checks,
    }
