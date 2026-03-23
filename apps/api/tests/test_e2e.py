"""End-to-end tests: full user workflow through the API."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
class TestE2EWorkflow:
    """Full user journey: register -> login -> create project -> create task -> comment -> complete."""

    async def test_full_user_workflow(self, client: AsyncClient):
        # 1. Register
        resp = await client.post("/api/v1/auth/register", json={
            "email": "e2e@test.com",
            "password": "TestPass123!",
            "full_name": "E2E User",
        })
        assert resp.status_code in (200, 201)
        user = resp.json()
        assert user["email"] == "e2e@test.com"

        # 2. Login
        resp = await client.post("/api/v1/auth/login", json={
            "email": "e2e@test.com",
            "password": "TestPass123!",
        })
        assert resp.status_code == 200
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create project
        resp = await client.post("/api/v1/projects", json={
            "name": "E2E Project",
            "description": "Created by E2E test",
        }, headers=headers)
        assert resp.status_code in (200, 201)
        project = resp.json()
        project_id = project["id"]

        # 4. Create task in project
        resp = await client.post("/api/v1/tasks", json={
            "title": "E2E Task",
            "description": "Test task",
            "priority": "high",
            "project_id": project_id,
        }, headers=headers)
        assert resp.status_code in (200, 201)
        task = resp.json()
        task_id = task["id"]

        # 5. Add comment to task
        resp = await client.post(f"/api/v1/tasks/{task_id}/comments", json={
            "content": "E2E comment",
        }, headers=headers)
        assert resp.status_code in (200, 201)

        # 6. Add label
        resp = await client.post("/api/v1/labels", json={
            "name": "e2e-label",
            "color": "#ff0000",
        }, headers=headers)
        assert resp.status_code in (200, 201)

        # 7. Update task status to done
        resp = await client.put(f"/api/v1/tasks/{task_id}", json={
            "status": "done",
        }, headers=headers)
        assert resp.status_code == 200

        # 8. Get task and verify status
        resp = await client.get(f"/api/v1/tasks/{task_id}", headers=headers)
        assert resp.status_code == 200
        assert resp.json()["status"] == "done"

        # 9. List notifications
        resp = await client.get("/api/v1/notifications", headers=headers)
        assert resp.status_code == 200

        # 10. Delete task
        resp = await client.delete(f"/api/v1/tasks/{task_id}", headers=headers)
        assert resp.status_code in (200, 204)

        # 11. Delete project
        resp = await client.delete(f"/api/v1/projects/{project_id}", headers=headers)
        assert resp.status_code in (200, 204)


@pytest.mark.asyncio
class TestHealthEndpoints:
    """Test health check endpoints."""

    async def test_health(self, client: AsyncClient):
        resp = await client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"

    async def test_health_db(self, client: AsyncClient):
        resp = await client.get("/health/db")
        assert resp.status_code == 200

    async def test_health_ready(self, client: AsyncClient):
        resp = await client.get("/health/ready")
        assert resp.status_code == 200
