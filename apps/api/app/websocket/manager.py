"""WebSocket connection manager and Socket.IO event handlers.

Architecture note — horizontal scaling
---------------------------------------
The current WebSocketManager stores connections in process-local dicts.
This works for a single API replica.  For multiple replicas, replace the
sio initialisation with a Redis-backed manager:

    import socketio
    mgr = socketio.AsyncRedisManager(settings.REDIS_URL)
    sio = socketio.AsyncServer(async_mode="asgi", client_manager=mgr, ...)

See: https://python-socketio.readthedocs.io/en/stable/server.html#scalability

Broadcast scope
---------------
All task/project events are scoped to the *project room* so that users only
receive events for projects they are members of.  Clients must call
`join_project` after connecting to subscribe to a project's events.
"""
from __future__ import annotations

import logging
from typing import Dict, Set

import socketio
from fastapi import FastAPI
from jose import JWTError, jwt

from app.core.config import settings

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.allowed_origins_list,
)


def _safe_log(value: object, max_len: int = 64) -> str:
    """Sanitise a value before logging (prevents log injection via CR/LF)."""
    return str(value).replace("\n", " ").replace("\r", " ").replace("\t", " ")[:max_len]


class WebSocketManager:
    """In-process connection registry.

    Tracks:
      active_connections  — user_id  -> set of sid
      _sid_to_user        — sid      -> user_id  (auth check)
      _project_members    — project_id -> set of user_id (room membership)
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

    def get_user_id(self, sid: str) -> str | None:
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
        self, project_id: str, event: str, data: dict, exclude_sid: str | None = None
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
            "WS event from unauthenticated sid %s — closing", _safe_log(sid)
        )
        return False
    return True


def _extract_project_id(data: dict) -> str | None:
    """Safely extract project_id from event payload."""
    pid = data.get("project_id") if isinstance(data, dict) else None
    return str(pid) if pid else None


# ---------------------------------------------------------------------------
# Socket.IO event handlers
# ---------------------------------------------------------------------------

@sio.on("connect")
async def handle_connect(sid: str, environ: dict, auth: dict | None):
    """Verify JWT supplied in socket.io auth handshake.

    Raises ConnectionRefusedError (socket.io standard) on auth failure.
    Token is expected as: { token: "<JWT>" }
    """
    token = auth.get("token") if isinstance(auth, dict) else None
    if not token:
        logger.warning("WS connect rejected: no token (sid: %s)", _safe_log(sid))
        raise ConnectionRefusedError("unauthorized")
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise JWTError("missing sub")
    except JWTError as exc:
        logger.warning(
            "WS connect rejected: invalid token — %s (sid: %s)", exc, _safe_log(sid)
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
    TODO: verify user is an actual member of the project (DB lookup).
    """
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    project_id = _extract_project_id(data)
    if not project_id:
        return
    user_id = ws_manager.get_user_id(sid)
    ws_manager.join_project(user_id, project_id)


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
