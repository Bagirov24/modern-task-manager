import socketio
from fastapi import FastAPI
from typing import Dict, Set
import logging
from jose import JWTError, jwt
from app.core.config import settings

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins=settings.allowed_origins_list,  # no wildcard
)


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[str]] = {}  # user_id -> set of sid
        self._sid_to_user: Dict[str, str] = {}             # sid -> user_id (for auth check)

    async def connect(self, sid: str, user_id: str):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(sid)
        self._sid_to_user[sid] = user_id
        safe_uid = _safe_log(user_id)
        logger.info("User %s connected (sid: %s)", safe_uid, _safe_log(sid))

    async def disconnect(self, sid: str):
        user_id = self._sid_to_user.pop(sid, None)
        if user_id and user_id in self.active_connections:
            self.active_connections[user_id].discard(sid)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        logger.info("sid %s disconnected", _safe_log(sid))

    def is_authenticated(self, sid: str) -> bool:
        """Return True only if sid was verified via JWT during connect."""
        return sid in self._sid_to_user

    async def send_to_user(self, user_id: str, event: str, data: dict):
        if user_id in self.active_connections:
            for sid in self.active_connections[user_id]:
                await sio.emit(event, data, room=sid)

    async def broadcast(self, event: str, data: dict):
        await sio.emit(event, data)

    def get_online_users(self) -> list:
        return list(self.active_connections.keys())


def _safe_log(value: object, max_len: int = 64) -> str:
    """Sanitize a value before logging to prevent log injection."""
    return str(value).replace("\n", " ").replace("\r", " ").replace("\t", " ")[:max_len]


ws_manager = WebSocketManager()


@sio.on("connect")
async def handle_connect(sid: str, environ: dict, auth: dict | None):
    """
    Verify JWT token supplied in socket.io auth handshake.
    Raises ConnectionRefusedError (socket.io standard) on failure.
    """
    token = auth.get("token") if isinstance(auth, dict) else None
    if not token:
        logger.warning("WS connect rejected: no token (sid: %s)", _safe_log(sid))
        raise ConnectionRefusedError("unauthorized")
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise JWTError("missing sub")
    except JWTError as exc:
        logger.warning("WS connect rejected: invalid token — %s (sid: %s)", exc, _safe_log(sid))
        raise ConnectionRefusedError("unauthorized")

    await ws_manager.connect(sid, str(user_id))
    await sio.emit("user_online", {"user_id": user_id}, skip_sid=sid)


@sio.on("disconnect")
async def handle_disconnect(sid: str):
    await ws_manager.disconnect(sid)


def _require_auth(sid: str) -> bool:
    """Disconnect unauthenticated sids silently."""
    if not ws_manager.is_authenticated(sid):
        logger.warning("WS event from unauthenticated sid %s — closing", _safe_log(sid))
        return False
    return True


@sio.on("task_update")
async def handle_task_update(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    await ws_manager.broadcast("task_updated", data)


@sio.on("task_create")
async def handle_task_create(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    await ws_manager.broadcast("task_created", data)


@sio.on("task_delete")
async def handle_task_delete(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    await ws_manager.broadcast("task_deleted", data)


@sio.on("project_update")
async def handle_project_update(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    await ws_manager.broadcast("project_updated", data)


@sio.on("project_create")
async def handle_project_create(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    await ws_manager.broadcast("project_created", data)


@sio.on("project_delete")
async def handle_project_delete(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    await ws_manager.broadcast("project_deleted", data)


@sio.on("cursor_move")
async def handle_cursor_move(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    await sio.emit("cursor_update", data, skip_sid=sid)


@sio.on("typing")
async def handle_typing(sid: str, data: dict):
    if not _require_auth(sid):
        await sio.disconnect(sid)
        return
    await sio.emit("user_typing", data, skip_sid=sid)


def setup_websocket(app: FastAPI):
    socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
    app.mount("/ws", socket_app)
