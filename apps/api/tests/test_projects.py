"""Tests for project CRUD endpoints."""
from __future__ import annotations

from httpx import AsyncClient

from tests.conftest import make_project, make_task, register_and_login


async def test_create_project(client: AsyncClient):
    headers = await register_and_login(client)
    project = await make_project(client, headers)
    assert project["name"] == "Test Project"
    assert "id" in project


async def test_create_project_invalid_color(client: AsyncClient):
    headers = await register_and_login(client)
    resp = await client.post(
        "/api/v1/projects/",
        json={"name": "Bad Color", "color": "red"},
        headers=headers,
    )
    assert resp.status_code == 422


async def test_list_projects(client: AsyncClient):
    headers = await register_and_login(client)
    await make_project(client, headers, name="Project Alpha")
    await make_project(client, headers, name="Project Beta")
    resp = await client.get("/api/v1/projects/", headers=headers)
    assert resp.status_code == 200
    names = [p["name"] for p in resp.json()["projects"]]
    assert "Project Alpha" in names
    assert "Project Beta" in names


async def test_get_project(client: AsyncClient):
    headers = await register_and_login(client)
    project = await make_project(client, headers)
    resp = await client.get(f"/api/v1/projects/{project['id']}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == project["id"]


async def test_update_project(client: AsyncClient):
    headers = await register_and_login(client)
    project = await make_project(client, headers)
    resp = await client.patch(
        f"/api/v1/projects/{project['id']}",
        json={"name": "Renamed Project"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Renamed Project"


async def test_archive_project(client: AsyncClient):
    headers = await register_and_login(client)
    project = await make_project(client, headers)
    resp = await client.post(
        f"/api/v1/projects/{project['id']}/archive",
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["is_archived"] is True


async def test_archived_projects_excluded_by_default(client: AsyncClient):
    headers = await register_and_login(client)
    project = await make_project(client, headers, name="To Archive")
    await client.post(f"/api/v1/projects/{project['id']}/archive", headers=headers)
    resp = await client.get("/api/v1/projects/", headers=headers)
    ids = [p["id"] for p in resp.json()["projects"]]
    assert project["id"] not in ids


async def test_delete_project(client: AsyncClient):
    headers = await register_and_login(client)
    project = await make_project(client, headers)
    resp = await client.delete(f"/api/v1/projects/{project['id']}", headers=headers)
    assert resp.status_code == 204
    resp2 = await client.get(f"/api/v1/projects/{project['id']}", headers=headers)
    assert resp2.status_code == 404


async def test_project_stats(client: AsyncClient):
    headers = await register_and_login(client)
    project = await make_project(client, headers)
    resp = await client.get(f"/api/v1/projects/{project['id']}/stats", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "total_tasks" in body
    assert "progress" in body

async def test_project_stats_include_complete_blocked_and_missing_action_counts(client: AsyncClient):
    headers = await register_and_login(client)
    project = await make_project(client, headers)
    await make_task(
        client,
        headers,
        title="Blocked with action",
        project_id=project["id"],
        is_blocked=True,
        next_action="Resolve dependency",
    )
    await make_task(client, headers, title="Null action", project_id=project["id"])
    await make_task(client, headers, title="Empty action", project_id=project["id"], next_action="")
    await make_task(client, headers, title="Whitespace action", project_id=project["id"], next_action="   ")
    await make_task(client, headers, title="Nonempty action", project_id=project["id"], next_action="Ship result")
    await make_task(
        client,
        headers,
        title="Closed without action",
        project_id=project["id"],
        status="done",
        workflow_status="done",
    )

    resp = await client.get(f"/api/v1/projects/{project['id']}/stats", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["total_tasks"] == 6
    assert body["blocked_count"] == 1
    assert body["missing_next_action_count"] == 3


async def test_project_isolation(client: AsyncClient):
    """User B cannot access User A's project."""
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    project_a = await make_project(client, headers_a)

    resp = await client.get(f"/api/v1/projects/{project_a['id']}", headers=headers_b)
    assert resp.status_code == 404

    resp = await client.delete(
        f"/api/v1/projects/{project_a['id']}", headers=headers_b
    )
    assert resp.status_code == 404
