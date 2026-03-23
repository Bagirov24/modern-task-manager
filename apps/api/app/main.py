from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, tasks, projects, comments, labels, notifications, subtasks
from app.websocket.manager import setup_websocket
from app.middleware.rate_limit import RateLimitMiddleware
from app.core.config import settings

app = FastAPI(
    title="Modern Task Manager API",
    description="Full-featured task management API with AI and real-time collaboration",
    version="1.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
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

# WebSocket
setup_websocket(app)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
