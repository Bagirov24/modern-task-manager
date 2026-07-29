from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse
from collections import defaultdict
import time
import re

# Simple regex to accept only valid IPv4 / IPv6 strings as cache keys
_IP_RE = re.compile(
    r"^("
    r"(\d{1,3}\.){3}\d{1,3}"           # IPv4
    r"|"
    r"[0-9a-fA-F:]{2,39}"               # IPv6 (simplified)
    r")$"
)


def _get_client_ip(request: Request) -> str:
    """
    Return the real client IP respecting reverse-proxy headers.
    Validates the result against a simple regex to prevent header injection
    from being used as a cache-key bypass.
    Falls back to direct connection IP.
    """
    forwarded_for = request.headers.get("X-Forwarded-For", "")
    if forwarded_for:
        # The leftmost entry is the original client
        candidate = forwarded_for.split(",")[0].strip()
        if _IP_RE.match(candidate):
            return candidate
    # Fallback: direct connection
    return request.client.host if request.client else "unknown"


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        client_ip = _get_client_ip(request)
        now = time.time()

        self.requests[client_ip] = [
            t for t in self.requests[client_ip] if now - t < self.window_seconds
        ]

        if len(self.requests[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests"},
            )

        self.requests[client_ip].append(now)
        return await call_next(request)
