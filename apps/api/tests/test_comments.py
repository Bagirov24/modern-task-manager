"""Tests for comment endpoints."""
from __future__ import annotations

from uuid import uuid4

from httpx import AsyncClient

from tests.conftest import make_task, register_and_login


async def _make_comment(
    client: AsyncClient,
    headers: dict,
    task_id: str,
    content: str = "Hello world",
) -> dict:
    resp = await client.post(
        "/api/v1/comments/",
        json={"task_id": task_id, "content": content},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_comment(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    comment = await _make_comment(client, headers, task["id"])
    assert comment["content"] == "Hello world"
    assert comment["author_id"] is not None


async def test_create_comment_blank_content(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    resp = await client.post(
        "/api/v1/comments/",
        json={"task_id": task["id"], "content": "   "},
        headers=headers,
    )
    assert resp.status_code == 422


async def test_list_comments(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    await _make_comment(client, headers, task["id"], "First")
    await _make_comment(client, headers, task["id"], "Second")
    resp = await client.get(f"/api/v1/comments/task/{task['id']}", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["comments"]) >= 2


async def test_list_comments_pagination(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    for i in range(5):
        await _make_comment(client, headers, task["id"], f"Comment {i}")
    resp = await client.get(
        f"/api/v1/comments/task/{task['id']}?page=1&per_page=2",
        headers=headers,
    )
    assert resp.status_code == 200
    assert len(resp.json()["comments"]) == 2


async def test_update_comment(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    comment = await _make_comment(client, headers, task["id"])
    resp = await client.patch(
        f"/api/v1/comments/{comment['id']}",
        json={"content": "Updated content"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["content"] == "Updated content"


async def test_update_comment_not_owned(client: AsyncClient):
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    task = await make_task(client, headers_a)
    comment = await _make_comment(client, headers_a, task["id"])
    resp = await client.patch(
        f"/api/v1/comments/{comment['id']}",
        json={"content": "Hijacked"},
        headers=headers_b,
    )
    assert resp.status_code == 404


async def test_delete_comment(client: AsyncClient):
    headers = await register_and_login(client)
    task = await make_task(client, headers)
    comment = await _make_comment(client, headers, task["id"])
    resp = await client.delete(
        f"/api/v1/comments/{comment['id']}", headers=headers
    )
    assert resp.status_code == 204


async def test_delete_comment_not_owned(client: AsyncClient):
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    task = await make_task(client, headers_a)
    comment = await _make_comment(client, headers_a, task["id"])
    resp = await client.delete(
        f"/api/v1/comments/{comment['id']}", headers=headers_b
    )
    assert resp.status_code == 404


async def test_comments_unauthenticated(client: AsyncClient):
    resp = await client.post(
        "/api/v1/comments/",
        json={"task_id": str(uuid4()), "content": "x"},
    )
    assert resp.status_code in (401, 403)
