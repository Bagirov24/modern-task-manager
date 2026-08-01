import pytest

from tests.conftest import make_project, make_task, register_and_login


@pytest.mark.asyncio
async def test_document_version_history_restore_and_task_link(client):
    headers = await register_and_login(client)
    project = await make_project(client, headers, name="Context project")
    task = await make_task(client, headers, title="Documented task", project_id=project["id"])

    created = await client.post("/api/v1/documents/", headers=headers, json={
        "title": "Integration brief",
        "content_markdown": "## Context\nSafe architecture notes",
        "document_type": "brief",
        "project_id": project["id"],
        "task_id": task["id"],
    })
    assert created.status_code == 201, created.text
    document = created.json()
    assert document["version"] == 1
    assert document["task_id"] == task["id"]

    updated = await client.patch(
        f"/api/v1/documents/{document['id']}", headers=headers,
        json={"content_markdown": "## Context\nUpdated safe notes", "expected_version": 1, "change_summary": "Clarified context"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["version"] == 2

    versions = await client.get(f"/api/v1/documents/{document['id']}/versions", headers=headers)
    assert [item["version"] for item in versions.json()] == [2, 1]

    restored = await client.post(f"/api/v1/documents/{document['id']}/versions/1/restore", headers=headers, json={})
    assert restored.status_code == 200, restored.text
    assert restored.json()["version"] == 3
    assert restored.json()["content_markdown"] == "## Context\nSafe architecture notes"


@pytest.mark.asyncio
async def test_document_rejects_secret_without_echoing_it(client):
    headers = await register_and_login(client)
    secret = "4111111111111111"
    response = await client.post("/api/v1/documents/", headers=headers, json={
        "title": "Unsafe", "content_markdown": "Card: " + secret,
    })
    assert response.status_code == 422
    assert secret not in response.text
    assert "input" not in response.text
