import pytest

from tests.conftest import make_project, make_task, register_and_login


@pytest.mark.asyncio
async def test_ready_requires_complete_planning(client):
    headers = await register_and_login(client)
    task = await make_task(client, headers, title="Needs planning")
    response = await client.patch(f"/api/v1/tasks/{task['id']}", headers=headers, json={"workflow_status": "ready"})
    assert response.status_code == 422
    assert response.json()["detail"]["code"] == "incomplete_planning"


@pytest.mark.asyncio
async def test_workflow_maps_to_legacy_status_and_block_requires_reason(client):
    headers = await register_and_login(client)
    project = await make_project(client, headers)
    task = await make_task(client, headers, title="Prepared", project_id=project["id"])
    prepared = await client.patch(f"/api/v1/tasks/{task['id']}", headers=headers, json={
        "workflow_status": "ready", "context": "Why", "expected_result": "Result",
        "acceptance_criteria": "- [ ] Works",
    })
    assert prepared.status_code == 200, prepared.text
    assert prepared.json()["status"] == "todo"
    assert prepared.json()["is_planning_complete"] is True

    denied = await client.patch(f"/api/v1/tasks/{task['id']}", headers=headers, json={"is_blocked": True})
    assert denied.status_code == 422
    blocked = await client.patch(f"/api/v1/tasks/{task['id']}", headers=headers, json={"is_blocked": True, "blocked_reason": "Waiting for API"})
    assert blocked.status_code == 200
    assert blocked.json()["is_blocked"] is True
