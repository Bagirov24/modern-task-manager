"""Alembic environment configuration.

Fix: switched to async engine so migrations run correctly with the
asyncpg driver.  The previous sync engine_from_config() call caused
"greenlet_spawn has not been called" errors when the DATABASE_URL used
the asyncpg dialect.

Also strips the +asyncpg suffix when building the migration URL because
Alembic's engine_from_config does not understand the async driver;
we use AsyncConnection.run_sync() instead.
"""
from __future__ import annotations

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from logging.config import fileConfig

from alembic import context
from sqlalchemy.ext.asyncio import AsyncConnection, create_async_engine

from app.core.database import Base
from app.models import *  # noqa: F401, F403 — ensures all models are registered

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Allow DATABASE_URL env var to override alembic.ini value.
_db_url = os.environ.get("DATABASE_URL", config.get_main_option("sqlalchemy.url", ""))

# Ensure the URL uses the asyncpg driver.
if _db_url.startswith("postgresql://"):
    _db_url = _db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif _db_url.startswith("postgres://"):
    _db_url = _db_url.replace("postgres://", "postgresql+asyncpg://", 1)

target_metadata = Base.metadata


def do_run_migrations(connection):
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Create an async engine and run migrations via run_sync."""
    connectable = create_async_engine(_db_url, echo=False)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


run_migrations_online()
