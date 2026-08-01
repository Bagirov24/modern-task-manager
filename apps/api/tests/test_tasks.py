"""Tests for task CRUD endpoints."""
from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import make_task, register_and_login


async def test_health_check(client: AsyncClient):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"


async def test_create_task(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    assert task["title"] == "Test Task"
    assert task["priority"] == "medium"
    assert "id" in task


async def test_create_task_blank_title(client: AsyncClient):
    headers = await register_and_login(client)
    resp = await client.post(
        "/api/v1/tasks/",
        json={"title": "   ", "priority": "medium"},
        headers=headers,
    )
    assert resp.status_code == 422


async def test_list_tasks(client: AsyncClient):
    headers = await register_and_login(client)
    await make_task(client, headers, title="Task A")
    await make_task(client, headers, title="Task B")
    resp = await client.get("/api/v1/tasks/", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["tasks"]) >= 2


async def test_get_task(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    resp = await client.get(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == task["id"]


async def test_task_response_resolves_commitment_owners(client: AsyncClient):
    headers = await register_and_login(client)
    profile_response = await client.get("/api/v1/auth/me", headers=headers)
    assert profile_response.status_code == 200, profile_response.text
    profile = profile_response.json()

    response = await client.post(
        "/api/v1/tasks/",
        headers=headers,
        json={
            "title": "Resolve responsibility",
            "manager_id": profile["id"],
            "next_action_owner_id": profile["id"],
            "waiting_for_user_id": profile["id"],
        },
    )
    assert response.status_code == 201, response.text
    task = response.json()
    assert task["manager"]["id"] == profile["id"]
    assert task["next_action_owner"]["id"] == profile["id"]
    assert task["waiting_for_user"]["id"] == profile["id"]


async def test_update_task(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    # PATCH (not PUT — router only has PATCH)
    resp = await client.patch(
        f"/api/v1/tasks/{task['id']}",
        json={"title": "Updated Title", "status": "in_progress"},
        headers=headers,
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["title"] == "Updated Title"
    assert body["status"] == "in_progress"


async def test_delete_task(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    resp = await client.delete(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert resp.status_code == 204
    resp2 = await client.get(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert resp2.status_code == 404


async def test_filter_tasks_by_status(client: AsyncClient):
    headers = await register_and_login(client)
    await make_task(client, headers, title="Todo Task", status="todo")
    resp = await client.get("/api/v1/tasks/?status=todo", headers=headers)
    assert resp.status_code == 200
    for t in resp.json()["tasks"]:
        assert t["status"] == "todo"


async def test_filter_tasks_by_priority(client: AsyncClient):
    headers = await register_and_login(client)
    await make_task(client, headers, title="High Task", priority="high")
    resp = await client.get("/api/v1/tasks/?priority=high", headers=headers)
    assert resp.status_code == 200
    for t in resp.json()["tasks"]:
        assert t["priority"] == "high"


async def test_search_tasks(client: AsyncClient):
    headers = await register_and_login(client)
    await make_task(client, headers, title="Build Feature")
    await make_task(client, headers, title="Fix Bug")
    resp = await client.get("/api/v1/tasks/?search=Feature", headers=headers)
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()["tasks"]]
    assert any("Feature" in t for t in titles)


async def test_search_tasks_too_long(client: AsyncClient):
    headers = await register_and_login(client)
    resp = await client.get(
        f"/api/v1/tasks/?search={'x' * 201}", headers=headers
    )
    assert resp.status_code == 422


async def test_pagination(client: AsyncClient):
    headers = await register_and_login(client)
    for i in range(5):
        await make_task(client, headers, title=f"Paginated {i}")
    resp = await client.get("/api/v1/tasks/?page=1&per_page=2", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["tasks"]) == 2
    assert data["total"] >= 5


async def test_create_task_unauthenticated(client: AsyncClient):
    resp = await client.post("/api/v1/tasks/", json={"title": "No Auth"})
    assert resp.status_code in (401, 403)


async def test_task_isolation(client: AsyncClient):
    """User A cannot see or modify User B's tasks."""
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    task_a = await make_task(client, headers_a, title="Private Task A")

    # B cannot GET A's task
    resp = await client.get(f"/api/v1/tasks/{task_a['id']}", headers=headers_b)
    assert resp.status_code == 404

    # B cannot DELETE A's task
    resp = await client.delete(f"/api/v1/tasks/{task_a['id']}", headers=headers_b)
    assert resp.status_code == 404
