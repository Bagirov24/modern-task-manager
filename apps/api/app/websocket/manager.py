import socketio
from fastapi import FastAPI
from typing import Dict, Set

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")


class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[str]] = {}  # user_id -> set of sid

    async def connect(self, sid: str, user_id: str):
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(sid)

    async def disconnect(self, sid: str):
        for user_id, sids in self.active_connections.items():
            sids.discard(sid)
            if not sids:
                del self.active_connections[user_id]
                break

    async def send_to_user(self, user_id: str, data: dict):
        if user_id in self.active_connections:
            for sid in self.active_connections[user_id]:
                await sio.emit("notification", data, room=sid)

    async def broadcast(self, event: str, data: dict):
        await sio.emit(event, data)


ws_manager = WebSocketManager()


@sio.on("connect")
async def handle_connect(sid, environ, auth):
    user_id = auth.get("user_id") if auth else None
    if user_id:
        await ws_manager.connect(sid, user_id)


@sio.on("disconnect")
async def handle_disconnect(sid):
    await ws_manager.disconnect(sid)


@sio.on("task_update")
async def handle_task_update(sid, data):
    await ws_manager.broadcast("task_updated", data)


@sio.on("cursor_move")
async def handle_cursor(sid, data):
    await sio.emit("cursor_update", data, skip_sid=sid)


def setup_websocket(app: FastAPI):
    socket_app = socketio.ASGIApp(sio, other_asgi_app=app)
    app.mount("/ws", socket_app)
