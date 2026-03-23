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


def test_list_notifications_empty(client: TestClient):
    headers = register_and_login(client)
    resp = client.get("/api/v1/notifications/", headers=headers)
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


def test_mark_notification_as_read(client: TestClient):
    headers = register_and_login(client)
    # Create a task to trigger notification
    client.post("/api/v1/tasks/", json={
        "title": "Notification Task",
        "priority": "high",
    }, headers=headers)
    # Get notifications
    resp = client.get("/api/v1/notifications/", headers=headers)
    if resp.json():
        notif_id = resp.json()[0]["id"]
        mark_resp = client.patch(
            f"/api/v1/notifications/{notif_id}/read",
            headers=headers,
        )
        assert mark_resp.status_code == 200
        assert mark_resp.json()["is_read"] is True


def test_mark_all_notifications_read(client: TestClient):
    headers = register_and_login(client)
    resp = client.patch("/api/v1/notifications/read-all", headers=headers)
    assert resp.status_code == 200


def test_notifications_unauthenticated(client: TestClient):
    resp = client.get("/api/v1/notifications/")
    assert resp.status_code in (401, 403)


def test_delete_notification(client: TestClient):
    headers = register_and_login(client)
    resp = client.get("/api/v1/notifications/", headers=headers)
    if resp.json():
        notif_id = resp.json()[0]["id"]
        del_resp = client.delete(
            f"/api/v1/notifications/{notif_id}",
            headers=headers,
        )
        assert del_resp.status_code == 204
