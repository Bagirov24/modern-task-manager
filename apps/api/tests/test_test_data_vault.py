import pytest

from tests.conftest import register_and_login


@pytest.mark.asyncio
async def test_safe_vault_reference_and_restricted_reauthentication(client):
    headers = await register_and_login(client)
    created = await client.post("/api/v1/test-data/sets", headers=headers, json={
        "name": "3DS Successful Payment",
        "category": "payment",
        "environment": "sandbox",
        "sensitivity": "restricted",
        "description": "Successful payment with 3DS; expect payment.status = succeeded",
    })
    assert created.status_code == 201, created.text
    data_set = created.json()

    denied = await client.get(f"/api/v1/test-data/sets/{data_set['id']}", headers=headers)
    assert denied.status_code == 401

    reauth = await client.post("/api/v1/test-data/reauth", headers=headers, json={"password": "StrongPass1!"})
    assert reauth.status_code == 200, reauth.text
    restricted_headers = {**headers, "X-Reauth-Token": reauth.json()["reauth_token"]}

    item = await client.post(f"/api/v1/test-data/sets/{data_set['id']}/items", headers=restricted_headers, json={
        "label": "Sandbox merchant key",
        "item_type": "vault_reference",
        "display_value": "Use the sandbox merchant alias for the 3DS scenario",
        "vault_provider": "External Vault",
        "vault_reference": "vault://payments/sandbox/merchant-api-key",
        "metadata_json": {"expected_result": "payment.status = succeeded"},
    })
    assert item.status_code == 201, item.text

    viewed = await client.get(f"/api/v1/test-data/items/{item.json()['id']}", headers=restricted_headers)
    assert viewed.status_code == 200, viewed.text
    assert viewed.json()["vault_reference"].startswith("vault://")
    assert "@" in viewed.json()["watermark"]


@pytest.mark.asyncio
async def test_vault_item_never_accepts_card_or_token(client):
    headers = await register_and_login(client)
    created = await client.post("/api/v1/test-data/sets", headers=headers, json={
        "name": "Sandbox fixtures", "category": "fixture",
        "environment": "sandbox", "sensitivity": "internal",
    })
    data_set_id = created.json()["id"]
    secret = "4111111111111111"
    response = await client.post(f"/api/v1/test-data/sets/{data_set_id}/items", headers=headers, json={
        "label": "Unsafe fixture", "item_type": "fixture", "display_value": secret,
    })
    assert response.status_code == 422
    assert secret not in response.text
