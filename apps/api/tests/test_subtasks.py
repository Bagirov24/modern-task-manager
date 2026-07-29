"""Tests for subtask endpoints."""
from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import make_task, register_and_login


async def _make_subtask(
    client: AsyncClient,
    headers: dict,
    parent_id: str,
    title: str = "Sub Task",
) -> dict:
    resp = await client.post(
        f"/api/v1/tasks/{parent_id}/subtasks",
        json={"title": title, "priority": "low"},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_subtask(client: AsyncClient):
    headers = await register_and_login(client)
    parent = await make_task(client, headers, title="Parent")
    sub = await _make_subtask(client, headers, parent["id"])
    assert sub["title"] == "Sub Task"
    assert sub["parent_id"] == parent["id"]


async def test_list_subtasks(client: AsyncClient):
    headers = await register_and_login(client)
    parent = await make_task(client, headers)
    await _make_subtask(client, headers, parent["id"], title="Sub A")
    await _make_subtask(client, headers, parent["id"], title="Sub B")
    resp = await client.get(
        f"/api/v1/tasks/{parent['id']}/subtasks", headers=headers
    )
    assert resp.status_code == 200
    titles = [s["title"] for s in resp.json()]
    assert "Sub A" in titles
    assert "Sub B" in titles


async def test_update_subtask(client: AsyncClient):
    headers = await register_and_login(client)
    parent = await make_task(client, headers)
    sub = await _make_subtask(client, headers, parent["id"])
    resp = await client.patch(
        f"/api/v1/tasks/{parent['id']}/subtasks/{sub['id']}",
        json={"title": "Updated Sub", "status": "in_progress"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Updated Sub"
    assert body["status"] == "in_progress"


async def test_complete_subtask_sets_completed_at(client: AsyncClient):
    """Completing a subtask must set completed_at (timezone-aware)."""
    headers = await register_and_login(client)
    parent = await make_task(client, headers)
    sub = await _make_subtask(client, headers, parent["id"])
    resp = await client.patch(
        f"/api/v1/tasks/{parent['id']}/subtasks/{sub['id']}",
        json={"status": "done"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["completed_at"] is not None


async def test_delete_subtask(client: AsyncClient):
    headers = await register_and_login(client)
    parent = await make_task(client, headers)
    sub = await _make_subtask(client, headers, parent["id"])
    resp = await client.delete(
        f"/api/v1/tasks/{parent['id']}/subtasks/{sub['id']}",
        headers=headers,
    )
    assert resp.status_code == 204


async def test_subtask_progress(client: AsyncClient):
    headers = await register_and_login(client)
    parent = await make_task(client, headers)
    s1 = await _make_subtask(client, headers, parent["id"], title="S1")
    s2 = await _make_subtask(client, headers, parent["id"], title="S2")
    # Complete one subtask
    await client.patch(
        f"/api/v1/tasks/{parent['id']}/subtasks/{s1['id']}",
        json={"status": "done"},
        headers=headers,
    )
    resp = await client.get(
        f"/api/v1/tasks/{parent['id']}/subtasks/progress", headers=headers
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["total"] == 2
    assert body["done"] == 1
    assert body["progress"] == 50


async def test_subtask_isolation_parent(client: AsyncClient):
    """Cannot access subtasks of a task belonging to another user."""
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    parent_a = await make_task(client, headers_a)
    resp = await client.get(
        f"/api/v1/tasks/{parent_a['id']}/subtasks", headers=headers_b
    )
    assert resp.status_code == 404


async def test_create_subtask_not_owned_parent(client: AsyncClient):
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    parent_a = await make_task(client, headers_a)
    resp = await client.post(
        f"/api/v1/tasks/{parent_a['id']}/subtasks",
        json={"title": "Injected", "priority": "low"},
        headers=headers_b,
    )
    assert resp.status_code == 404


async def test_update_subtask_wrong_parent(client: AsyncClient):
    """Subtask id under wrong parent_id returns 404."""
    headers = await register_and_login(client)
    p1 = await make_task(client, headers, title="P1")
    p2 = await make_task(client, headers, title="P2")
    sub = await _make_subtask(client, headers, p1["id"])
    resp = await client.patch(
        f"/api/v1/tasks/{p2['id']}/subtasks/{sub['id']}",
        json={"title": "Wrong"},
        headers=headers,
    )
    assert resp.status_code == 404


async def test_subtasks_unauthenticated(client: AsyncClient):
    from uuid import uuid4
    resp = await client.get(f"/api/v1/tasks/{uuid4()}/subtasks")
    assert resp.status_code in (401, 403)
