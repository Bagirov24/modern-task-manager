"""Tests for label endpoints — ownership and validation."""
from __future__ import annotations

import pytest
from httpx import AsyncClient

from tests.conftest import make_task, register_and_login


async def _make_label(
    client: AsyncClient, headers: dict, name: str = "Bug", color: str = "#ef4444"
) -> dict:
    resp = await client.post(
        "/api/v1/labels/",
        json={"name": name, "color": color},
        headers=headers,
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_create_label(client: AsyncClient):
    headers = await register_and_login(client)
    label = await _make_label(client, headers)
    assert label["name"] == "Bug"
    assert label["color"] == "#ef4444"


async def test_create_label_invalid_color(client: AsyncClient):
    headers = await register_and_login(client)
    resp = await client.post(
        "/api/v1/labels/",
        json={"name": "X", "color": "red"},
        headers=headers,
    )
    assert resp.status_code in (422, 400)


async def test_list_labels_scoped_to_owner(client: AsyncClient):
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    await _make_label(client, headers_a, name="LabelA")
    await _make_label(client, headers_b, name="LabelB")

    resp_a = await client.get("/api/v1/labels/", headers=headers_a)
    names_a = [lb["name"] for lb in resp_a.json()]
    assert "LabelA" in names_a
    assert "LabelB" not in names_a


async def test_update_label(client: AsyncClient):
    headers = await register_and_login(client)
    label = await _make_label(client, headers)
    resp = await client.patch(
        f"/api/v1/labels/{label['id']}",
        json={"name": "Feature"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["name"] == "Feature"


async def test_update_label_not_owned(client: AsyncClient):
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    label_a = await _make_label(client, headers_a)
    resp = await client.patch(
        f"/api/v1/labels/{label_a['id']}",
        json={"name": "Stolen"},
        headers=headers_b,
    )
    assert resp.status_code == 404


async def test_delete_label(client: AsyncClient):
    headers = await register_and_login(client)
    label = await _make_label(client, headers)
    resp = await client.delete(f"/api/v1/labels/{label['id']}", headers=headers)
    assert resp.status_code == 204


async def test_delete_label_not_owned(client: AsyncClient):
    headers_a = await register_and_login(client)
    headers_b = await register_and_login(client)
    label_a = await _make_label(client, headers_a)
    resp = await client.delete(
        f"/api/v1/labels/{label_a['id']}", headers=headers_b
    )
    assert resp.status_code == 404
