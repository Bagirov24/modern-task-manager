from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path
from uuid import uuid4

import psycopg2
import pytest
from alembic.config import Config
from alembic.script import ScriptDirectory
from psycopg2 import sql
from sqlalchemy.engine import make_url


def _sync_url(raw_url: str):
    return make_url(raw_url.replace("postgresql+asyncpg://", "postgresql://", 1))


@pytest.mark.integration
def test_fresh_database_can_upgrade_to_head():
    raw_url = os.environ.get("TEST_DATABASE_URL")
    if not raw_url or not raw_url.startswith(("postgresql://", "postgresql+asyncpg://")):
        pytest.skip("PostgreSQL TEST_DATABASE_URL is required")

    api_root = Path(__file__).resolve().parents[1]
    database_name = f"taskmanager_migration_{uuid4().hex[:12]}"
    test_url = _sync_url(raw_url).set(database=database_name)
    admin_url = test_url.set(database="postgres")

    admin = psycopg2.connect(admin_url.render_as_string(hide_password=False))
    admin.autocommit = True
    try:
        with admin.cursor() as cursor:
            cursor.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(database_name)))

        env = os.environ.copy()
        env["DATABASE_URL"] = test_url.render_as_string(hide_password=False)
        migrated = subprocess.run(
            [sys.executable, "-m", "alembic", "upgrade", "head"],
            cwd=api_root,
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
            check=False,
        )
        assert migrated.returncode == 0, migrated.stdout + migrated.stderr

        config = Config(str(api_root / "alembic.ini"))
        expected_head = ScriptDirectory.from_config(config).get_current_head()
        migrated_db = psycopg2.connect(test_url.render_as_string(hide_password=False))
        try:
            with migrated_db.cursor() as cursor:
                cursor.execute("SELECT version_num FROM alembic_version")
                assert cursor.fetchone() == (expected_head,)
                cursor.execute("SELECT to_regclass('public.communication_items'), to_regclass('public.documents')")
                assert cursor.fetchone() == ("communication_items", "documents")
                cursor.execute(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'tasks' "
                    "AND column_name IN ('manager_id', 'next_action_owner_id', 'waiting_for_user_id')"
                )
                assert {row[0] for row in cursor.fetchall()} == {
                    "manager_id",
                    "next_action_owner_id",
                    "waiting_for_user_id",
                }
        finally:
            migrated_db.close()
    finally:
        with admin.cursor() as cursor:
            cursor.execute(
                "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = %s",
                (database_name,),
            )
            cursor.execute(sql.SQL("DROP DATABASE IF EXISTS {}").format(sql.Identifier(database_name)))
        admin.close()
