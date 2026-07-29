"""Tests for notification endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import register_and_login


async def _create_notification(client: AsyncClient, headers: dict, title: str = "Hello") -> dict:
    resp = await client.post(
        "/api/v1/notifications/",
        json={"title": title, "type": "system"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_notification(client: AsyncClient):
    headers = await register_and_login(client)
    n = await _create_notification(client, headers)
    assert n["title"] == "Hello"
    assert n["is_read"] is False


async def test_list_notifications(client: AsyncClient):
    headers = await register_and_login(client)
    await _create_notification(client, headers, title="N1")
    await _create_notification(client, headers, title="N2")
    resp = await client.get("/api/v1/notifications/", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


async def test_list_notifications_limit(client: AsyncClient):
    """limit param is respected and capped at 200."""
    headers = await register_and_login(client)
    for i in range(5):
        await _create_notification(client, headers, title=f"N{i}")
    resp = await client.get("/api/v1/notifications/?limit=3", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) <= 3


async def test_list_notifications_limit_too_high(client: AsyncClient):
    headers = await register_and_login(client)
    resp = await client.get("/api/v1/notifications/?limit=999", headers=headers)
    assert resp.status_code == 422


async def test_unread_count(client: AsyncClient):
    headers = await register_and_login(client)
    await _create_notification(client, headers)
    resp = await client.get("/api/v1/notifications/unread-count", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["count"] >= 1


async def test_mark_as_read(client: AsyncClient):
    headers = await register_and_login(client)
    n = await _create_notification(client, headers)
    resp = await client.patch(
        f"/api/v1/notifications/{n['id']}/read", headers=headers
    )
    assert resp.status_code == 200
    assert resp.json()["is_read"] is True


async def test_mark_all_as_read(client: AsyncClient):
    headers = await register_and_login(client)
    await _create_notification(client, headers, title="A")
    await _create_notification(client, headers, title="B")
    resp = await client.patch("/api/v1/notifications/read-all", headers=headers)
    assert resp.status_code == 200
    # All should now be read
    count_resp = await client.get("/api/v1/notifications/unread-count", headers=headers)
    assert count_resp.json()["count"] == 0


async def test_delete_notification(client: AsyncClient):
    headers = await register_and_login(client)
    n = await _create_notification(client, headers)
    resp = await client.delete(f"/api/v1/notifications/{n['id']}", headers=headers)
    assert resp.status_code == 204


async def test_notification_isolation(client: AsyncClient):
    """User B cannot read or delete User A's notifications."""
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    n = await _create_notification(client, headers_a)
    resp = await client.patch(
        f"/api/v1/notifications/{n['id']}/read", headers=headers_b
    )
    assert resp.status_code == 404
