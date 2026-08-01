import pytest

from tests.conftest import make_project, make_task, register_and_login


def link_payload(**overrides):
    return {
        "title": "Elasticsearch / Kibana",
        "description": "Search logs, API errors and system events.",
        "url": "https://kibana.example.com/app/discover",
        "category": "logs",
        "environment": "production",
        "login": "manager@example.com",
        "access_status": "has_access",
        "access_hint": "Password in 1Password: CRM / Kibana Production",
        "notes": "Use for client and integration errors.",
        "tags": ["api", "errors"],
        **overrides,
    }


@pytest.mark.asyncio
async def test_workspace_link_crud_search_and_favorite(client):
    headers = await register_and_login(client)
    project = await make_project(client, headers, name="CRM")
    created = await client.post("/api/v1/workspace-links/", headers=headers, json=link_payload(project_id=project["id"]))
    assert created.status_code == 201, created.text
    link = created.json()
    assert link["project_name"] == "CRM"
    assert link["is_favorite"] is False

    searched = await client.get("/api/v1/workspace-links/?search=errors&category=logs", headers=headers)
    assert searched.status_code == 200
    assert searched.json()["total"] == 1

    favorited = await client.patch(f"/api/v1/workspace-links/{link['id']}", headers=headers, json={"is_favorite": True})
    assert favorited.status_code == 200
    assert favorited.json()["is_favorite"] is True
    favorites = await client.get("/api/v1/workspace-links/?favorites_only=true", headers=headers)
    assert [item["id"] for item in favorites.json()["links"]] == [link["id"]]

    assert (await client.delete(f"/api/v1/workspace-links/{link['id']}", headers=headers)).status_code == 204
    assert (await client.get(f"/api/v1/workspace-links/{link['id']}", headers=headers)).status_code == 404


@pytest.mark.asyncio
async def test_workspace_link_task_association(client):
    headers = await register_and_login(client)
    project = await make_project(client, headers, name="Modern Task Manager")
    task = await make_task(client, headers, title="Payment error", project_id=project["id"])
    link = (await client.post("/api/v1/workspace-links/", headers=headers, json=link_payload(project_id=project["id"]))).json()

    attached = await client.put(f"/api/v1/workspace-links/tasks/{task['id']}/{link['id']}", headers=headers)
    assert attached.status_code == 200, attached.text
    listed = await client.get(f"/api/v1/workspace-links/tasks/{task['id']}", headers=headers)
    assert [item["id"] for item in listed.json()] == [link["id"]]
    assert (await client.delete(f"/api/v1/workspace-links/tasks/{task['id']}/{link['id']}", headers=headers)).status_code == 204
    assert (await client.get(f"/api/v1/workspace-links/tasks/{task['id']}", headers=headers)).json() == []


@pytest.mark.asyncio
async def test_workspace_link_rejects_secrets_without_echo(client):
    headers = await register_and_login(client)
    secret = "4111111111111111"
    response = await client.post("/api/v1/workspace-links/", headers=headers, json=link_payload(notes="Card " + secret))
    assert response.status_code == 422
    assert secret not in response.text
