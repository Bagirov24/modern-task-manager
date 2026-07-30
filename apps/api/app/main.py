import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.v1 import auth, tasks, projects, comments, labels, notifications, subtasks
from app.api import health
from app.websocket.manager import setup_websocket
from app.core.database import engine
from app.models import user, task, project, comment, label, notification  # noqa: F401
from app.middleware.rate_limit import RateLimitMiddleware
from app.middleware.correlation import CorrelationIDMiddleware
from app.core.config import settings
from app.core.logging_config import configure_logging

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Lifespan: startup / graceful shutdown
# ---------------------------------------------------------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    # ── startup ──────────────────────────────────────────────────────────
    configure_logging(debug=settings.DEBUG)
    logger.info(
        "API starting up",
        extra={"version": "1.0.0", "debug": settings.DEBUG},
    )
    yield
    # ── shutdown ─────────────────────────────────────────────────────────
    logger.info("API shutting down — disposing DB connection pool")
    await engine.dispose()


app = FastAPI(
    title="Modern Task Manager API",
    description="Full-featured task management API with AI and real-time collaboration",
    version="1.0.0",
    lifespan=lifespan,
    # Disable auto-generated OpenAPI in production to avoid info disclosure.
    # Set to None in production via an env-conditioned override if needed.
)


# ---------------------------------------------------------------------------
# Global exception handler
# Never expose stack traces, DB URLs, or secret keys to clients.
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled exception on %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# ---------------------------------------------------------------------------
# Middleware  (order matters: outermost first)
# ---------------------------------------------------------------------------

# 1. Correlation ID  — must be first so all subsequent middleware/handlers log it
app.add_middleware(CorrelationIDMiddleware)

# 2. CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Rate limiting  (Redis-backed — see middleware/rate_limit.py)
if settings.ENVIRONMENT != "test":
    app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------
@app.get("/", include_in_schema=False)
async def api_root() -> RedirectResponse:
    return RedirectResponse(url="/docs")

app.include_router(auth.router,          prefix="/api/v1/auth",          tags=["Auth"])
app.include_router(tasks.router,         prefix="/api/v1/tasks",         tags=["Tasks"])
app.include_router(subtasks.router,      prefix="/api/v1/tasks",         tags=["Subtasks"])
app.include_router(projects.router,      prefix="/api/v1/projects",      tags=["Projects"])
app.include_router(comments.router,      prefix="/api/v1/comments",      tags=["Comments"])
app.include_router(labels.router,        prefix="/api/v1/labels",        tags=["Labels"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(health.router,        tags=["Health"])

# WebSocket
setup_websocket(app)
