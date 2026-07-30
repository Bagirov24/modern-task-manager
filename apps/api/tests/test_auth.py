"""Tests for authentication endpoints."""
from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.conftest import register_and_login


async def _register(client: AsyncClient, **overrides) -> dict:
    uid = uuid4().hex[:8]
    data = {
        "email": f"auth_{uid}@example.com",
        "username": f"authuser_{uid}",
        "password": "StrongPass1!",
        "full_name": "Auth User",
        **overrides,
    }
    resp = await client.post("/api/v1/auth/register", json=data)
    return resp


async def test_register_success(client: AsyncClient):
    resp = await _register(client)
    assert resp.status_code == 201
    body = resp.json()
    assert "id" in body
    assert "email" in body
    assert "hashed_password" not in body


async def test_register_duplicate_email(client: AsyncClient):
    uid = uuid4().hex[:8]
    email = f"dup_{uid}@example.com"
    await _register(client, email=email, username=f"user1_{uid}")
    resp2 = await _register(client, email=email, username=f"user2_{uid}")
    assert resp2.status_code == 400
    assert "Email" in resp2.json()["detail"]


async def test_register_duplicate_username(client: AsyncClient):
    uid = uuid4().hex[:8]
    username = f"dupuser_{uid}"
    await _register(client, username=username, email=f"e1_{uid}@example.com")
    resp2 = await _register(client, username=username, email=f"e2_{uid}@example.com")
    assert resp2.status_code == 400
    assert "Username" in resp2.json()["detail"]


async def test_register_weak_password(client: AsyncClient):
    resp = await _register(client, password="short")
    assert resp.status_code == 422


async def test_register_invalid_username(client: AsyncClient):
    resp = await _register(client, username="bad username!")
    assert resp.status_code == 422


async def test_login_success(client: AsyncClient):
    uid = uuid4().hex[:8]
    email = f"login_{uid}@example.com"
    await _register(client, email=email, username=f"lgn_{uid}")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass1!"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body
    assert "refresh_token" in body
    assert body["token_type"] == "bearer"


async def test_login_wrong_password(client: AsyncClient):
    uid = uuid4().hex[:8]
    email = f"wp_{uid}@example.com"
    await _register(client, email=email, username=f"wp_{uid}")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "WrongPassword!"},
    )
    assert resp.status_code == 401


async def test_login_unknown_email(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@nowhere.com", "password": "whatever"},
    )
    assert resp.status_code == 401


async def test_login_case_insensitive_email(client: AsyncClient):
    uid = uuid4().hex[:8]
    email = f"CASE_{uid}@Example.COM"
    await _register(client, email=email, username=f"ci_{uid}")
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email.lower(), "password": "StrongPass1!"},
    )
    assert resp.status_code == 200


async def test_get_me(client: AsyncClient):
    headers = await register_and_login(client)
    resp = await client.get("/api/v1/auth/me", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert "email" in body
    assert "hashed_password" not in body


async def test_get_me_unauthenticated(client: AsyncClient):
    resp = await client.get("/api/v1/auth/me")
    assert resp.status_code == 401


async def test_refresh_token(client: AsyncClient):
    uid = uuid4().hex[:8]
    email = f"ref_{uid}@example.com"
    await _register(client, email=email, username=f"rf_{uid}")
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass1!"},
    )
    refresh_token = login_resp.json()["refresh_token"]
    resp = await client.post(
        "/api/v1/auth/refresh",
        params={"refresh_token": refresh_token},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert "access_token" in body


async def test_refresh_invalid_token(client: AsyncClient):
    resp = await client.post(
        "/api/v1/auth/refresh",
        params={"refresh_token": "not.a.valid.token"},
    )
    assert resp.status_code == 401


async def test_logout(client: AsyncClient):
    headers = await register_and_login(client)
    resp = await client.post("/api/v1/auth/logout", headers=headers)
    assert resp.status_code == 204

async def test_update_profile(client: AsyncClient):
    headers = await register_and_login(client)
    username = f"updated_{uuid4().hex[:8]}"
    resp = await client.patch(
        "/api/v1/auth/profile",
        json={"username": username, "full_name": "Updated User"},
        headers=headers,
    )
    assert resp.status_code == 200
    assert resp.json()["username"] == username
    assert resp.json()["full_name"] == "Updated User"


async def test_update_profile_duplicate_username(client: AsyncClient):
    duplicate = f"duplicate_{uuid4().hex[:8]}"
    await _register(client, username=duplicate)
    headers = await register_and_login(client)
    resp = await client.patch(
        "/api/v1/auth/profile",
        json={"username": duplicate},
        headers=headers,
    )
    assert resp.status_code == 400


async def test_change_password_rejects_wrong_current(client: AsyncClient):
    headers = await register_and_login(client)
    resp = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "WrongPass1!", "new_password": "NewStrongPass1!"},
        headers=headers,
    )
    assert resp.status_code == 400


async def test_change_password(client: AsyncClient):
    uid = uuid4().hex[:8]
    email = f"password_{uid}@example.com"
    password = "StrongPass1!"
    await _register(client, email=email, username=f"pwd_{uid}", password=password)
    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    headers = {"Authorization": f"Bearer {login_resp.json()['access_token']}"}

    resp = await client.post(
        "/api/v1/auth/change-password",
        json={"current_password": password, "new_password": "NewStrongPass1!"},
        headers=headers,
    )
    assert resp.status_code == 204

    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "NewStrongPass1!"},
    )
    assert new_login.status_code == 200