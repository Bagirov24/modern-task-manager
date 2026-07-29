"""Correlation ID middleware.

Injects a unique ``X-Request-ID`` header into every request/response so
that all log lines emitted during a request can be traced together in a
log aggregator.

Behaviour
---------
- If the inbound request carries an ``X-Request-ID`` header, that value is
  used (allows end-to-end tracing from the client / load balancer).
- Otherwise a fresh UUID-4 is generated.
- The ID is bound into the structlog context-var store so that every
  ``logger.*()`` call inside the request automatically includes it.
- The ID is echoed back in the response ``X-Request-ID`` header.

Security note
-------------
The inbound header value is truncated to 64 chars and stripped of
control characters to prevent log injection attacks.
"""
from __future__ import annotations

import re
import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# Allow only printable ASCII; strip anything that could poison log lines.
_SAFE_ID_RE = re.compile(r"[^\x20-\x7E]")
_MAX_ID_LEN = 64


def _sanitise_id(value: str) -> str:
    sanitised = _SAFE_ID_RE.sub("", value)[:_MAX_ID_LEN].strip()
    return sanitised if sanitised else str(uuid.uuid4())


class CorrelationIDMiddleware(BaseHTTPMiddleware):
    """Attach a correlation ID to every request and response."""

    async def dispatch(self, request: Request, call_next) -> Response:
        raw_id = request.headers.get("X-Request-ID", "")
        correlation_id = _sanitise_id(raw_id) if raw_id else str(uuid.uuid4())

        # Bind into structlog context vars so all loggers in this request
        # automatically emit the correlation_id field.
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(correlation_id=correlation_id)

        response: Response = await call_next(request)

        # Echo the ID back so clients / load balancers can correlate.
        response.headers["X-Request-ID"] = correlation_id

        # Clean up context vars to avoid leaking into the next request
        # if connection keep-alive reuses the same coroutine context.
        structlog.contextvars.clear_contextvars()
        return response
