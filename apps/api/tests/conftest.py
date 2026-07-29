"""Async test infrastructure for Modern Task Manager.

Design
------
- Uses ``create_async_engine`` with the asyncpg driver (matching production).
- ``session`` fixture wraps each test in a SAVEPOINT that is rolled back
  after the test — much faster than drop/recreate per test.
- ``client`` fixture provides an ``httpx.AsyncClient`` that talks to the
  FastAPI ASGI app in-process (no real HTTP sockets needed).
- Shared helpers (``register_and_login``, ``make_task``, ``make_project``)
  are defined here so all test modules can import them from conftest.

Requirements added to requirements.txt (test section):
  httpx, pytest-asyncio, anyio[trio] (optional)
"""
from __future__ import annotations

import os
from typing import AsyncGenerator
from uuid import uuid4

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.database import Base, get_db
from app.main import app

# ---------------------------------------------------------------------------
# Database URL for tests
# ---------------------------------------------------------------------------
_RAW_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://test:test@localhost:5432/test_db",
)
# Ensure asyncpg driver is used.
if _RAW_URL.startswith("postgresql://"):
    TEST_DB_URL = _RAW_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _RAW_URL.startswith("postgres://"):
    TEST_DB_URL = _RAW_URL.replace("postgres://", "postgresql+asyncpg://", 1)
else:
    TEST_DB_URL = _RAW_URL

# ---------------------------------------------------------------------------
# Engine + session factory  (session-scoped: one engine for the whole run)
# ---------------------------------------------------------------------------
_engine = create_async_engine(TEST_DB_URL, echo=False)
_async_session = async_sessionmaker(
    _engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _create_tables():
    """Create all tables once before the test session; drop after."""
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with _engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await _engine.dispose()


@pytest_asyncio.fixture()
async def session() -> AsyncGenerator[AsyncSession, None]:
    """Per-test async session that rolls back via SAVEPOINT.

    Each test gets a clean slice of the database without the overhead of
    recreating all tables.
    """
    async with _async_session() as s:
        await s.begin_nested()  # SAVEPOINT
        try:
            yield s
        finally:
            await s.rollback()


@pytest_asyncio.fixture()
async def client(session: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """httpx AsyncClient wired to the FastAPI ASGI app.

    Overrides get_db so every request uses the test SAVEPOINT session.
    """
    async def _override_get_db():
        yield session

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Shared test helpers
# ---------------------------------------------------------------------------

async def register_and_login(client: AsyncClient) -> dict:
    """Register a fresh user and return Authorization headers."""
    uid = uuid4().hex[:8]
    email = f"user_{uid}@example.com"
    username = f"user_{uid}"
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "username": username,
            "password": "StrongPass1!",
            "full_name": "Test User",
        },
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": "StrongPass1!"},
    )
    assert resp.status_code == 200, resp.text
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def make_task(
    client: AsyncClient,
    headers: dict,
    title: str = "Test Task",
    **overrides,
) -> dict:
    """Create a task and return its JSON."""
    data = {"title": title, "priority": "medium", **overrides}
    resp = await client.post("/api/v1/tasks/", json=data, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()


async def make_project(
    client: AsyncClient,
    headers: dict,
    name: str = "Test Project",
    **overrides,
) -> dict:
    """Create a project and return its JSON."""
    data = {"name": name, "color": "#38bdf8", **overrides}
    resp = await client.post("/api/v1/projects/", json=data, headers=headers)
    assert resp.status_code == 201, resp.text
    return resp.json()
