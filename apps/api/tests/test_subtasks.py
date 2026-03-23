import pytest
from fastapi.testclient import TestClient
from uuid import uuid4


def register_and_login(client: TestClient):
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


def create_task_with_subtasks(client, headers):
    task_resp = client.post("/api/v1/tasks/", json={
        "title": "Parent Task",
        "description": "Task with subtasks",
        "priority": "high",
    }, headers=headers)
    assert task_resp.status_code == 201
    task_id = task_resp.json()["id"]
    return task_id


def test_create_subtask(client: TestClient):
    headers = register_and_login(client)
    task_id = create_task_with_subtasks(client, headers)
    resp = client.post(
        f"/api/v1/tasks/{task_id}/subtasks",
        json={"title": "Subtask 1"},
        headers=headers,
    )
    assert resp.status_code == 201
    assert resp.json()["title"] == "Subtask 1"
    assert resp.json()["is_completed"] is False


def test_list_subtasks(client: TestClient):
    headers = register_and_login(client)
    task_id = create_task_with_subtasks(client, headers)
    client.post(f"/api/v1/tasks/{task_id}/subtasks", json={"title": "Sub A"}, headers=headers)
    client.post(f"/api/v1/tasks/{task_id}/subtasks", json={"title": "Sub B"}, headers=headers)
    resp = client.get(f"/api/v1/tasks/{task_id}/subtasks", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 2


def test_toggle_subtask(client: TestClient):
    headers = register_and_login(client)
    task_id = create_task_with_subtasks(client, headers)
    sub = client.post(f"/api/v1/tasks/{task_id}/subtasks", json={"title": "Toggle Me"}, headers=headers)
    sub_id = sub.json()["id"]
    resp = client.patch(f"/api/v1/tasks/{task_id}/subtasks/{sub_id}/toggle", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["is_completed"] is True


def test_delete_subtask(client: TestClient):
    headers = register_and_login(client)
    task_id = create_task_with_subtasks(client, headers)
    sub = client.post(f"/api/v1/tasks/{task_id}/subtasks", json={"title": "Delete Me"}, headers=headers)
    sub_id = sub.json()["id"]
    resp = client.delete(f"/api/v1/tasks/{task_id}/subtasks/{sub_id}", headers=headers)
    assert resp.status_code == 204


def test_subtask_progress(client: TestClient):
    headers = register_and_login(client)
    task_id = create_task_with_subtasks(client, headers)
    sub1 = client.post(f"/api/v1/tasks/{task_id}/subtasks", json={"title": "S1"}, headers=headers).json()
    sub2 = client.post(f"/api/v1/tasks/{task_id}/subtasks", json={"title": "S2"}, headers=headers).json()
    client.patch(f"/api/v1/tasks/{task_id}/subtasks/{sub1['id']}/toggle", headers=headers)
    resp = client.get(f"/api/v1/tasks/{task_id}/subtasks/progress", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["total"] == 2
    assert data["completed"] == 1
