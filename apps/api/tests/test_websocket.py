"""Tests for WebSocket (Socket.IO) authentication and event routing.

Uses python-socketio AsyncSimpleClient (or AsyncClient) to connect
directly to the ASGI app via httpx_ws / starlette TestClient transport.
All tests share the in-process sio server — no real network needed.
"""
from __future__ import annotations

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import pytest

from tests.conftest import register_and_login
from app.websocket.manager import ws_manager, sio


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _sio_connect(
    token: str,
    server=None,
) -> tuple[str, bool]:
    """Simulate a Socket.IO connect event and return (sid, success)."""
    sid = str(uuid4())
    try:
        await sio.handle_request(
            {
                "REQUEST_METHOD": "GET",
                "PATH_INFO": "/ws/socket.io/",
                "QUERY_STRING": f"transport=polling&sid={sid}",
                "HTTP_CONNECTION": "Upgrade",
            },
            lambda *_: None,
        )
    except Exception:
        pass

    # Directly invoke the connect handler (bypasses transport)
    try:
        await sio._trigger_event(
            "connect", "/", sid, {}, {"token": token}
        )
        return sid, True
    except Exception:
        return sid, False


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestWebSocketAuth:
    async def test_connect_no_token_rejected(self):
        sid = str(uuid4())
        with pytest.raises(Exception):
            await sio._trigger_event("connect", "/", sid, {}, None)
        assert not ws_manager.is_authenticated(sid)

    async def test_connect_invalid_token_rejected(self):
        sid = str(uuid4())
        with pytest.raises(Exception):
            await sio._trigger_event(
                "connect", "/", sid, {}, {"token": "not-a-jwt"}
            )
        assert not ws_manager.is_authenticated(sid)

    async def test_connect_blacklisted_token_rejected(
        self, client, monkeypatch
    ):
        """A valid JWT whose jti is in Redis blacklist must be rejected."""
        headers = await register_and_login(client)
        # Monkeypatch blacklist check to always return True.
        monkeypatch.setattr(
            "app.websocket.manager._is_jti_blacklisted",
            AsyncMock(return_value=True),
        )
        import jwt as jose_jwt
        from app.core.config import settings
        from app.core.security import create_access_token
        token = create_access_token({"sub": str(uuid4())})
        sid = str(uuid4())
        with pytest.raises(Exception):
            await sio._trigger_event(
                "connect", "/", sid, {}, {"token": token}
            )
        assert not ws_manager.is_authenticated(sid)

    async def test_connect_refresh_token_rejected(self, monkeypatch):
        """A refresh token (type='refresh') must not open a WS session."""
        monkeypatch.setattr(
            "app.websocket.manager._is_jti_blacklisted",
            AsyncMock(return_value=False),
        )
        from app.core.security import create_refresh_token
        token = create_refresh_token({"sub": str(uuid4())})
        sid = str(uuid4())
        with pytest.raises(Exception):
            await sio._trigger_event(
                "connect", "/", sid, {}, {"token": token}
            )
        assert not ws_manager.is_authenticated(sid)


class TestProjectRooms:
    async def test_join_project_membership_check_denied(
        self, monkeypatch
    ):
        """join_project emits error when user is not a project member."""
        monkeypatch.setattr(
            "app.websocket.manager._user_is_project_member",
            AsyncMock(return_value=False),
        )
        user_id = str(uuid4())
        sid = str(uuid4())
        await ws_manager.connect(sid, user_id)

        emitted = []
        async def fake_emit(event, data=None, room=None, **kw):
            emitted.append((event, data))
        monkeypatch.setattr(sio, "emit", fake_emit)

        await sio._trigger_event(
            "join_project", "/", sid,
            {"project_id": str(uuid4())},
        )
        await ws_manager.disconnect(sid)
        assert any(e == "error" for e, _ in emitted)

    async def test_join_project_membership_check_allowed(
        self, monkeypatch
    ):
        monkeypatch.setattr(
            "app.websocket.manager._user_is_project_member",
            AsyncMock(return_value=True),
        )
        user_id = str(uuid4())
        sid = str(uuid4())
        project_id = str(uuid4())
        await ws_manager.connect(sid, user_id)

        emitted = []
        async def fake_emit(event, data=None, room=None, **kw):
            emitted.append((event, data))
        monkeypatch.setattr(sio, "emit", fake_emit)

        await sio._trigger_event(
            "join_project", "/", sid, {"project_id": project_id}
        )
        await ws_manager.disconnect(sid)
        assert user_id in ws_manager._project_members.get(project_id, set()) or \
               any(e == "joined_project" for e, _ in emitted)

    async def test_disconnect_cleans_up_project_rooms(self):
        user_id = str(uuid4())
        sid = str(uuid4())
        project_id = str(uuid4())
        await ws_manager.connect(sid, user_id)
        ws_manager.join_project(user_id, project_id)
        assert user_id in ws_manager._project_members[project_id]
        await ws_manager.disconnect(sid)
        assert user_id not in ws_manager._project_members.get(project_id, set())

    async def test_unauthenticated_event_disconnects_sid(self, monkeypatch):
        disconnected = []
        monkeypatch.setattr(sio, "disconnect", AsyncMock(side_effect=lambda s: disconnected.append(s)))
        fake_sid = str(uuid4())  # not in ws_manager
        await sio._trigger_event(
            "task_update", "/", fake_sid,
            {"project_id": str(uuid4()), "task_id": str(uuid4())},
        )
        assert fake_sid in disconnected
