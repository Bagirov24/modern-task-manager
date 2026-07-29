import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.v1 import auth, tasks, projects, comments, labels, notifications, subtasks
from app.api import health
from app.websocket.manager import setup_websocket
from app.core.database import engine, Base
from app.models import user, task, project, comment, label, notification  # noqa: F401
from app.middleware.rate_limit import RateLimitMiddleware
from app.core.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(
    title="Modern Task Manager API",
    description="Full-featured task management API with AI and real-time collaboration",
    version="1.0.0",
)

# ---------------------------------------------------------------------------
# Global exception handler
# Catches any unhandled exception before it reaches FastAPI's default handler.
# Logs full traceback server-side (including DATABASE_URL, keys, etc.) but
# returns only a generic message to the client.
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )

# Create database tables
Base.metadata.create_all(bind=engine)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Rate limiting
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)

# Routes
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(tasks.router, prefix="/api/v1/tasks", tags=["Tasks"])
app.include_router(subtasks.router, prefix="/api/v1/tasks", tags=["Subtasks"])
app.include_router(projects.router, prefix="/api/v1/projects", tags=["Projects"])
app.include_router(comments.router, prefix="/api/v1/comments", tags=["Comments"])
app.include_router(labels.router, prefix="/api/v1/labels", tags=["Labels"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(health.router, tags=["Health"])

# WebSocket
setup_websocket(app)
