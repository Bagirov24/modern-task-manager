import pytest
from fastapi.testclient import TestClient
from uuid import uuid4


def test_health_check(client: TestClient):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def register_and_login(client: TestClient):
    """Helper: register a user and return auth headers."""
    email = f"test_{uuid4().hex[:8]}@example.com"
    client.post("/api/v1/auth/register", json={
        "email": email,
        "username": f"user_{uuid4().hex[:8]}",
        "password": "TestPass123!",
        "full_name": "Test User",
    })
    resp = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": "TestPass123!",
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_task(client: TestClient, headers: dict, **overrides):
    """Helper: create a task and return JSON response."""
    data = {"title": "Test Task", "description": "A test task", "priority": "medium"}
    data.update(overrides)
    resp = client.post("/api/v1/tasks/", json=data, headers=headers)
    assert resp.status_code == 201
    return resp.json()


def test_create_task(client: TestClient):
    headers = register_and_login(client)
    task = create_task(client, headers)
    assert task["title"] == "Test Task"
    assert task["priority"] == "medium"
    assert "id" in task


def test_list_tasks(client: TestClient):
    headers = register_and_login(client)
    create_task(client, headers, title="Task A")
    create_task(client, headers, title="Task B")
    resp = client.get("/api/v1/tasks/", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] >= 2
    assert len(data["tasks"]) >= 2


def test_get_task(client: TestClient):
    headers = register_and_login(client)
    task = create_task(client, headers)
    resp = client.get(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["id"] == task["id"]


def test_update_task(client: TestClient):
    headers = register_and_login(client)
    task = create_task(client, headers)
    resp = client.put(
        f"/api/v1/tasks/{task['id']}",
        json={"title": "Updated Title", "status": "in_progress"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated Title"
    assert resp.json()["status"] == "in_progress"


def test_delete_task(client: TestClient):
    headers = register_and_login(client)
    task = create_task(client, headers)
    resp = client.delete(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert resp.status_code == 204
    resp2 = client.get(f"/api/v1/tasks/{task['id']}", headers=headers)
    assert resp2.status_code == 404


def test_filter_tasks_by_status(client: TestClient):
    headers = register_and_login(client)
    create_task(client, headers, title="Todo Task", status="todo")
    create_task(client, headers, title="Done Task", status="done")
    resp = client.get("/api/v1/tasks/?status=todo", headers=headers)
    assert resp.status_code == 200
    for t in resp.json()["tasks"]:
        assert t["status"] == "todo"


def test_filter_tasks_by_priority(client: TestClient):
    headers = register_and_login(client)
    create_task(client, headers, title="High Task", priority="high")
    create_task(client, headers, title="Low Task", priority="low")
    resp = client.get("/api/v1/tasks/?priority=high", headers=headers)
    assert resp.status_code == 200
    for t in resp.json()["tasks"]:
        assert t["priority"] == "high"


def test_search_tasks(client: TestClient):
    headers = register_and_login(client)
    create_task(client, headers, title="Build Feature")
    create_task(client, headers, title="Fix Bug")
    resp = client.get("/api/v1/tasks/?search=Feature", headers=headers)
    assert resp.status_code == 200
    assert any("Feature" in t["title"] for t in resp.json()["tasks"])


def test_pagination(client: TestClient):
    headers = register_and_login(client)
    for i in range(5):
        create_task(client, headers, title=f"Task {i}")
    resp = client.get("/api/v1/tasks/?page=1&per_page=2", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["tasks"]) == 2
    assert data["total"] >= 5


def test_create_task_unauthenticated(client: TestClient):
    resp = client.post("/api/v1/tasks/", json={"title": "No Auth"})
    assert resp.status_code in (401, 403)
