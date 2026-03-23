import socketio
from fastapi import FastAPI
from typing import Dict, Set
import logging

logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[str]] = {}  # user_id -> set of sid

    async def connect(self, sid: str, user_id: str):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(sid)
        logger.info(f"User {user_id} connected (sid: {sid})")

    async def disconnect(self, sid: str):
        for user_id, sids in self.active_connections.items():
            sids.discard(sid)
            if not sids:
                del self.active_connections[user_id]
            break

    async def send_to_user(self, user_id: str, event: str, data: dict):
        if user_id in self.active_connections:
            for sid in self.active_connections[user_id]:
                await sio.emit(event, data, room=sid)

    async def broadcast(self, event: str, data: dict):
        await sio.emit(event, data)

    def get_online_users(self) -> list:
        return list(self.active_connections.keys())


ws_manager = WebSocketManager()


@sio.on("connect")
async def handle_connect(sid, environ, auth):
    user_id = auth.get("user_id") if auth else None
    if user_id:
        await ws_manager.connect(sid, user_id)
        await sio.emit("user_online", {"user_id": user_id}, skip_sid=sid)


@sio.on("disconnect")
async def handle_disconnect(sid):
    await ws_manager.disconnect(sid)


@sio.on("task_update")
async def handle_task_update(sid, data):
    await ws_manager.broadcast("task_updated", data)


@sio.on("task_create")
async def handle_task_create(sid, data):
    await ws_manager.broadcast("task_created", data)


@sio.on("task_delete")
async def handle_task_delete(sid, data):
    await ws_manager.broadcast("task_deleted", data)


@sio.on("project_update")
async def handle_project_update(sid, data):
    await ws_manager.broadcast("project_updated", data)


@sio.on("project_create")
async def handle_project_create(sid, data):
    await ws_manager.broadcast("project_created", data)


@sio.on("project_delete")
async def handle_project_delete(sid, data):
    await ws_manager.broadcast("project_deleted", data)


@sio.on("cursor_move")
async def handle_cursor_move(sid, data):
    await sio.emit("cursor_update", data, skip_sid=sid)


@sio.on("typing")
async def handle_typing(sid, data):
    await sio.emit("user_typing", data, skip_sid=sid)


def setup_websocket(app: FastAPI):
    socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
    app.mount("/ws", socket_app)
