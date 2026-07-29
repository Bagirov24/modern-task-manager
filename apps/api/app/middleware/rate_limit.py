"""Redis-backed rate-limiting middleware.

Replaces the previous in-memory defaultdict implementation which:
  - Was NOT thread-safe across multiple Uvicorn workers (shared nothing).
  - Allowed trivial bypass after process restart.
  - Had no persistence across deploys.

This version uses a Redis INCR + EXPIRE pipeline which is:
  - Atomic (no race condition).
  - Shared across all API replicas.
  - Persistent across restarts (until the key TTL expires).

Fallback behaviour
------------------
If Redis is unreachable the middleware logs a WARNING and allows the
request through.  This is intentional — a rate-limiter failure should
not cause a full service outage.  Adjust to fail-closed if your threat
model requires it.
"""
from __future__ import annotations

import logging
import re
from typing import Optional

import redis.asyncio as aioredis
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

from app.core.config import settings

logger = logging.getLogger(__name__)

# Simple regex to accept only valid IPv4 / IPv6 strings as cache keys.
# Prevents header-injection from being used as a Redis-key bypass.
_IP_RE = re.compile(
    r"^("
    r"(\d{1,3}\.){3}\d{1,3}"  # IPv4
    r"|"
    r"[0-9a-fA-F:]{2,39}"  # IPv6 (simplified)
    r")$"
)


def _get_client_ip(request: Request) -> str:
    """Return the real client IP, validated to prevent log/cache injection."""
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        candidate = forwarded_for.split(",")[0].strip()
        if _IP_RE.match(candidate):
            return candidate
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window rate limiter backed by Redis.

    Uses the INCR + EXPIRE pipeline so that:
    - The counter increments atomically.
    - The TTL is set only on the *first* request in each window,
      ensuring the window starts from the first hit (not last).
    """

    def __init__(
        self,
        app,
        max_requests: int = 100,
        window_seconds: int = 60,
    ) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._redis: Optional[aioredis.Redis] = None

    async def _get_redis(self) -> aioredis.Redis:
        """Lazy-initialise the Redis connection (singleton per worker)."""
        if self._redis is None:
            self._redis = aioredis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True,
                socket_connect_timeout=1,
                socket_timeout=1,
            )
        return self._redis

    async def dispatch(self, request: Request, call_next):
        client_ip = _get_client_ip(request)
        key = f"ratelimit:{client_ip}"

        try:
            redis = await self._get_redis()
            pipe = redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, self.window_seconds, nx=True)  # set TTL only if new key
            results = await pipe.execute()
            count: int = results[0]
        except Exception as exc:  # noqa: BLE001
            # Redis unreachable — fail open to avoid cascading outage.
            logger.warning(
                "RateLimitMiddleware: Redis unavailable (%s) — allowing request", exc
            )
            return await call_next(request)

        if count > self.max_requests:
            logger.info("Rate limit exceeded for IP %s (%d/%d)", client_ip, count, self.max_requests)
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please slow down."},
                headers={"Retry-After": str(self.window_seconds)},
            )

        return await call_next(request)
