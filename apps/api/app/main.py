import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.v1 import (
    auth, comments, communication_items, documents, labels, manager_status, notifications, project_tags,
    project_templates, projects, search, subtasks, tags, task_panel, tasks, test_data, workspace_links,
)
from app.api import health
from app.websocket.manager import setup_websocket
from app.core.database import engine
from app import models  # noqa: F401
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



@app.exception_handler(RequestValidationError)
async def safe_validation_error_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return validation details without echoing submitted values."""
    details = [
        {
            "type": error.get("type", "value_error"),
            "loc": list(error.get("loc", ())),
            "msg": error.get("msg", "Invalid input"),
        }
        for error in exc.errors()
    ]
    return JSONResponse(status_code=422, content={"detail": details})

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
app.include_router(task_panel.router,     prefix="/api/v1/tasks",         tags=["Task panel"])
app.include_router(project_templates.router, prefix="/api/v1/project-templates", tags=["Project templates"])
app.include_router(project_tags.router,  prefix="/api/v1/project-tags",  tags=["Project tags"])
app.include_router(tags.router,          prefix="/api/v1/tags",          tags=["Tags"])
app.include_router(documents.router,     prefix="/api/v1/documents",     tags=["Documents"])
app.include_router(test_data.router,     prefix="/api/v1/test-data",     tags=["Test Data Vault"])
app.include_router(search.router,        prefix="/api/v1/search",        tags=["Search"])
app.include_router(workspace_links.router, prefix="/api/v1/workspace-links", tags=["Workspace links"])
app.include_router(communication_items.router, prefix="/api/v1/communication-items", tags=["Action Inbox"])
app.include_router(manager_status.router, prefix="/api/v1/status", tags=["Manager status"])
app.include_router(health.router,        tags=["Health"])

# WebSocket
setup_websocket(app)
