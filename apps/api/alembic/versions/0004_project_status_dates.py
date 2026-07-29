"""Migration 0004: add status, start_date, due_date to projects table.

Revision ID: 0004_project_status_dates
Revises: 0003_description_format
Create Date: 2026-07-29

What this migration does
------------------------
1. Creates the PostgreSQL enum type ``projectstatus`` if absent.
2. Adds column ``projects.status`` (NOT NULL, DEFAULT 'active').
   Existing rows receive 'active' — a safe assumption since they
   were already actively used (not archived).
   Rows where is_archived=True are updated to 'cancelled' afterwards.
3. Adds columns ``projects.start_date`` and ``projects.due_date``
   (TIMESTAMPTZ, nullable) if absent.

Idempotent: safe to run multiple times.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0004_project_status_dates"
down_revision = "0003_description_format"
branch_labels = None
depends_on = None

_ENUM_NAME = "projectstatus"
_ENUM_VALUES = ("planning", "active", "on_hold", "completed", "cancelled")


def upgrade() -> None:
    conn = op.get_bind()

    # 1. Create enum type if absent.
    existing_enums = {
        row[0]
        for row in conn.execute(
            sa.text("SELECT typname FROM pg_type WHERE typcategory = 'E'")
        )
    }
    if _ENUM_NAME not in existing_enums:
        status_enum = postgresql.ENUM(*_ENUM_VALUES, name=_ENUM_NAME)
        status_enum.create(conn)

    # 2. Add columns if absent.
    existing_cols = {
        row[0]
        for row in conn.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'projects'"
            )
        )
    }

    if "status" not in existing_cols:
        op.add_column(
            "projects",
            sa.Column(
                "status",
                postgresql.ENUM(*_ENUM_VALUES, name=_ENUM_NAME, create_type=False),
                nullable=False,
                server_default="active",
            ),
        )
        # Sync legacy archived rows.
        conn.execute(
            sa.text(
                "UPDATE projects SET status = 'cancelled' WHERE is_archived = TRUE"
            )
        )

    if "start_date" not in existing_cols:
        op.add_column(
            "projects",
            sa.Column("start_date", sa.DateTime(timezone=True), nullable=True),
        )

    if "due_date" not in existing_cols:
        op.add_column(
            "projects",
            sa.Column("due_date", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("projects", "due_date")
    op.drop_column("projects", "start_date")
    op.drop_column("projects", "status")
    conn = op.get_bind()
    conn.execute(sa.text(f"DROP TYPE IF EXISTS {_ENUM_NAME}"))
