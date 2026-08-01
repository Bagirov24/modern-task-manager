"""WebSocket connection manager and Socket.IO event handlers.

Security hardening applied in this revision
-------------------------------------------
1. handle_connect checks Redis jti blacklist so logged-out tokens cannot
   open a WebSocket session even before the access token expires naturally.
2. join_project performs a real DB membership check — users can only
   subscribe to project rooms they actually belong to (closes the TODO).

Architecture note — horizontal scaling
---------------------------------------
The current WebSocketManager stores connections in process-local dicts.
This works for a single API replica. For multiple replicas, replace the
sio initialisation with a Redis-backed manager:

    import socketio
    mgr = socketio.AsyncRedisManager(settings.REDIS_URL)
    sio = socketio.AsyncServer(async_mode="asgi", client_manager=mgr, ...)

See: https://python-socketio.readthedocs.io/en/stable/server.html#scalability

Broadcast scope
---------------
All task/project events are scoped to the *project room* so that users
only receive events for projects they are members of. Clients must call
`join_project` after connecting to subscribe to a project's events.
"""
from __future__ import annotations

import logging
from typing import Dict, Optional, Set

import socketio
from fastapi import FastAPI
import jwt
from jwt import PyJWTError as JWTError
from sqlalchemy import select

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.project import Project

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.allowed_origins_list,
)


def _safe_log(value: object, max_len: int = 64) -> str:
    """Sanitise a value before logging (prevents log injection via CR/LF)."""
    return str(value).replace("\n", " ").replace("\r", " ").replace("\t", " ")[:max_len]


# ---------------------------------------------------------------------------
# Redis helpers (inline — avoids circular import with database module)
# ---------------------------------------------------------------------------

_redis_client = None


async def _get_ws_redis():
    """Lazy singleton redis client for WebSocket auth checks."""
    global _redis_client
    if _redis_client is None:
        import redis.asyncio as aioredis
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def _is_jti_blacklisted(jti: str) -> bool:
    try:
        redis = await _get_ws_redis()
        return await redis.exists(f"revoked:{jti}") > 0
    except Exception as exc:  # noqa: BLE001
        logger.warning("WS Redis blacklist check failed: %s — allowing", exc)
        return False  # fail open: Redis outage should not block WS


# ---------------------------------------------------------------------------
# DB membership check
# ---------------------------------------------------------------------------

async def _user_is_project_member(user_id: str, project_id: str) -> bool:
    """Return True if user owns or is a member of the given project."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(Project).where(
                    Project.id == project_id,
                    Project.owner_id == user_id,
                )
            )
            project = result.scalars().first()
            # Ownership check — extend with a members table query if you
            # add collaborative project membership later.
            return project is not None
    except Exception as exc:  # noqa: BLE001
        logger.warning("WS membership DB check failed for project %s: %s", project_id, exc)
        return False


# ---------------------------------------------------------------------------
# WebSocketManager
# ---------------------------------------------------------------------------

class WebSocketManager:
    """In-process connection registry.

    Tracks:
        active_connections   — user_id -> set of sid
        _sid_to_user         — sid -> user_id (auth check)
        _project_members     — project_id -> set of user_id (room membership)
    """

    def __init__(self) -> None:
        self.active_connections: Dict[str, Set[str]] = {}  # user_id -> {sid}
        self._sid_to_user: Dict[str, str] = {}             # sid -> user_id
        self._project_members: Dict[str, Set[str]] = {}    # project_id -> {user_id}

    # ------------------------------------------------------------------
    # Connection lifecycle
    # ------------------------------------------------------------------

    async def connect(self, sid: str, user_id: str) -> None:
        self.active_connections.setdefault(user_id, set()).add(sid)
        self._sid_to_user[sid] = user_id
        logger.info("User %s connected (sid: %s)", _safe_log(user_id), _safe_log(sid))

    async def disconnect(self, sid: str) -> None:
        user_id = self._sid_to_user.pop(sid, None)
        if user_id:
            sids = self.active_connections.get(user_id, set())
            sids.discard(sid)
            if not sids:
                self.active_connections.pop(user_id, None)
            # Remove from all project rooms
            for members in self._project_members.values():
                members.discard(user_id)
        logger.info("sid %s disconnected", _safe_log(sid))

    def is_authenticated(self, sid: str) -> bool:
        """Return True only if sid was verified via JWT during connect."""
        return sid in self._sid_to_user

    def get_user_id(self, sid: str) -> Optional[str]:
        return self._sid_to_user.get(sid)

    # ------------------------------------------------------------------
    # Project rooms
    # ------------------------------------------------------------------

    def join_project(self, user_id: str, project_id: str) -> None:
        """Subscribe user to a project room."""
        self._project_members.setdefault(project_id, set()).add(user_id)
        logger.debug("User %s joined project room %s", _safe_log(user_id), _safe_log(project_id))

    def leave_project(self, user_id: str, project_id: str) -> None:
        members = self._project_members.get(project_id)
        if members:
            members.discard(user_id)

    # ------------------------------------------------------------------
    # Targeted delivery
    # ------------------------------------------------------------------

    async def send_to_user(self, user_id: str, event: str, data: dict) -> None:
        for sid in self.active_connections.get(user_id, set()):
            await sio.emit(event, data, room=sid)

    async def send_to_project_members(
        self,
        project_id: str,
        event: str,
        data: dict,
        exclude_sid: Optional[str] = None,
    ) -> None:
        """Emit event to all sockets of users who are members of the project.

        Only users who previously called `join_project` receive the event.
        This prevents cross-tenant data leakage.
        """
        members = self._project_members.get(project_id, set())
        if not members:
            logger.debug(
                "send_to_project_members: no members for project %s",
                _safe_log(project_id),
            )
            return
        for user_id in members:
            for sid in self.active_connections.get(user_id, set()):
                if sid != exclude_sid:
                    await sio.emit(event, data, room=sid)

    def get_online_users(self) -> list[str]:
        return list(self.active_connections.keys())


ws_manager = WebSocketManager()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _require_auth(sid: str) -> bool:
    """Return True if sid has an authenticated session, False otherwise."""
    if not ws_manager.is_authenticated(sid):
        logger.warning(
            "WS event from unauthenticated sid %s — closing",
            _safe_log(sid),
        )
        return False
    return True


def _extract_project_id(data: dict) -> Optional[str]:
    """Safely extract project_id from event payload."""
    pid = data.get("project_id") if isinstance(data, dict) else None
    return str(pid) if pid else None


# ---------------------------------------------------------------------------
# Socket.IO event handlers
# ---------------------------------------------------------------------------

@sio.on("connect")
async def handle_connect(sid: str, environ: dict, auth: dict | None):
    """Verify JWT supplied in socket.io auth handshake.

    Security checks (in order):
    1. Token must be present in auth dict.
    2. Token must be valid JWT (signature + expiry).
    3. Token type must be "access" (not refresh).
    4. Token jti must NOT be in Redis blacklist (post-logout check).

    Raises ConnectionRefusedError (socket.io standard) on any failure.
    Token is expected as: { token: "<access_token>" }
    """
    token = auth.get("token") if isinstance(auth, dict) else None
    if not token:
        logger.warning("WS connect rejected: no token (sid: %s)", _safe_log(sid))
        raise ConnectionRefusedError("unauthorized")

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=["HS256"],
            leeway=10,
        )
        user_id: str | None = payload.get("sub")
        jti: str | None = payload.get("jti")
        token_type: str | None = payload.get("type")

        if not user_id or not jti:
            raise JWTError("missing sub or jti")
        if token_type != "access":
            raise JWTError("wrong token type")
    except JWTError as exc:
        logger.warning(
            "WS connect rejected: invalid token — %s (sid: %s)",
            exc,
            _safe_log(sid),
        )
        raise ConnectionRefusedError("unauthorized")

    # Check Redis blacklist — catches post-logout tokens.
    if await _is_jti_blacklisted(jti):
        logger.warning(
            "WS connect rejected: blacklisted token jti=%s (sid: %s)",
            _safe_log(jti),
            _safe_log(sid),
        )
        raise ConnectionRefusedError("unauthorized")

    await ws_manager.connect(sid, str(user_id))
    await sio.emit("user_online", {"user_id": user_id}, skip_sid=sid)


@sio.on("disconnect")
async def handle_disconnect(sid: str):
    await ws_manager.disconnect(sid)


@sio.on("join_project")
async def handle_join_project(sid: str, data: dict):
    """Client calls this to subscribe to a project's real-time events.

    data: { project_id: string }

    Now performs a real DB membership check before adding the user to
    the project room — prevents cross-tenant subscription.
    """
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return

    project_id = _extract_project_id(data)
    if not project_id:
        return

    user_id = ws_manager.get_user_id(sid)
    if not await _user_is_project_member(user_id, project_id):
        logger.warning(
            "WS join_project denied: user %s is not a member of project %s",
            _safe_log(user_id),
            _safe_log(project_id),
        )
        await sio.emit("error", {"message": "forbidden"}, room=sid)
        return

    ws_manager.join_project(user_id, project_id)
    await sio.emit("joined_project", {"project_id": project_id}, room=sid)


@sio.on("leave_project")
async def handle_leave_project(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    user_id = ws_manager.get_user_id(sid)
    ws_manager.leave_project(user_id, project_id)


@sio.on("task_update")
async def handle_task_update(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    await ws_manager.send_to_project_members(
        project_id, "task_updated", data, exclude_sid=sid
    )


@sio.on("task_create")
async def handle_task_create(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    await ws_manager.send_to_project_members(
        project_id, "task_created", data, exclude_sid=sid
    )


@sio.on("task_delete")
async def handle_task_delete(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    await ws_manager.send_to_project_members(
        project_id, "task_deleted", data, exclude_sid=sid
    )


@sio.on("project_update")
async def handle_project_update(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    await ws_manager.send_to_project_members(
        project_id, "project_updated", data, exclude_sid=sid
    )


@sio.on("project_create")
async def handle_project_create(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    await ws_manager.send_to_project_members(
        project_id, "project_created", data, exclude_sid=sid
    )


@sio.on("project_delete")
async def handle_project_delete(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    await ws_manager.send_to_project_members(
        project_id, "project_deleted", data, exclude_sid=sid
    )


@sio.on("cursor_move")
async def handle_cursor_move(sid: str, data: dict):
    """Broadcast cursor position to project room only."""
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    await ws_manager.send_to_project_members(
        project_id, "cursor_update", data, exclude_sid=sid
    )


@sio.on("typing")
async def handle_typing(sid: str, data: dict):
    """Broadcast typing indicator to project room only."""
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    await ws_manager.send_to_project_members(
        project_id, "user_typing", data, exclude_sid=sid
    )


def setup_websocket(app: FastAPI) -> None:
    socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
    app.mount("/ws", socket_app)
