from datetime import datetime, timedelta, timezone

import pytest

from tests.conftest import make_project, make_task, register_and_login


@pytest.mark.asyncio
async def test_task_commitment_chain_and_three_deadlines(client):
    headers = await register_and_login(client)
    project = await make_project(client, headers, name="Contract project")
    now = datetime.now(timezone.utc)
    created = await client.post("/api/v1/tasks/", headers=headers, json={
        "title": "Approve client contract", "project_id": project["id"],
        "task_type": "contract_approval", "workflow_status": "waiting_for_internal",
        "final_due_at": (now + timedelta(days=5)).isoformat(),
        "response_due_at": (now + timedelta(days=2)).isoformat(),
        "next_action_description": "Send lawyer feedback to client",
        "next_action_due_at": (now + timedelta(days=3)).isoformat(),
        "waiting_for_party": "internal", "follow_up_action_description": "Send response to client",
        "risk_level": "high", "communication_channel": "email",
    })
    assert created.status_code == 201, created.text
    task = created.json()
    assert task["task_type"] == "contract_approval"
    assert task["manager_id"]
    assert task["final_due_at"] and task["response_due_at"] and task["next_action_due_at"]
    assert task["next_action"] == "Send lawyer feedback to client"

    summary = await client.get(f"/api/v1/status/tasks/{task['id']}", headers=headers)
    assert summary.status_code == 200, summary.text
    assert summary.json()["recommended_action"] == "Send response to client"


@pytest.mark.asyncio
async def test_action_inbox_lifecycle_and_task_creation(client):
    headers = await register_and_login(client)
    project = await make_project(client, headers, name="CRM")
    created = await client.post("/api/v1/communication-items/", headers=headers, json={
        "source_type": "manual", "sender_name": "Client", "sender_role": "client",
        "subject": "Please clarify release date", "body_preview": "When will the release be ready?",
        "project_id": project["id"], "action_status": "needs_my_reply", "needs_reply": True,
        "next_action": "Ask the team for an estimate", "waiting_for_party": "internal", "importance": "high",
    })
    assert created.status_code == 201, created.text
    item = created.json()
    listed = await client.get("/api/v1/communication-items/?action_status=needs_my_reply", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["groups"]["needs_my_reply"] == 1

    updated = await client.patch(f"/api/v1/communication-items/{item['id']}", headers=headers, json={"action_status": "need_internal_input"})
    assert updated.status_code == 200
    converted = await client.post(f"/api/v1/communication-items/{item['id']}/create-task", headers=headers)
    assert converted.status_code == 200, converted.text
    assert converted.json()["task_id"]
    assert converted.json()["action_status"] == "done"


@pytest.mark.asyncio
async def test_action_inbox_rejects_secret_without_echo(client):
    headers = await register_and_login(client)
    secret = "4111111111111111"
    response = await client.post("/api/v1/communication-items/", headers=headers, json={
        "source_type": "manual", "sender_name": "Client", "body_preview": "Card: " + secret,
    })
    assert response.status_code == 422
    assert secret not in response.text


@pytest.mark.asyncio
async def test_project_status_and_requirement_document_extension(client):
    headers = await register_and_login(client)
    project = await make_project(client, headers, name="Knowledge project")
    await make_task(client, headers, title="Open work", project_id=project["id"], risk_level="critical")
    status = await client.get(f"/api/v1/status/projects/{project['id']}", headers=headers)
    assert status.status_code == 200
    assert status.json()["known"]

    document = await client.post("/api/v1/documents/", headers=headers, json={
        "title": "Contract requirements", "project_id": project["id"],
        "document_type": "contract", "confidentiality_level": "confidential",
        "content_markdown": "# Requirement\n\n## Business goal\nAgree safe terms.",
    })
    assert document.status_code == 201, document.text
    assert document.json()["confidentiality_level"] == "confidential"
