"""Migration 0003: add description_format to tasks table.

Revision ID: 0003_description_format
Revises: 0002_label_owner_id_indexes
Create Date: 2026-07-29

What this migration does
------------------------
1. Creates the DescriptionFormat enum type in PostgreSQL if it does not
   already exist ('plain', 'markdown', 'html').
2. Adds column tasks.description_format with DEFAULT 'html', NOT NULL.
   Existing rows receive 'html' (most were created via the web UI which
   already sent HTML from the textarea).

Idempotent: safe to run multiple times.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0003_description_format"
down_revision = "0002_label_owner_id_indexes"
branch_labels = None
depends_on = None

_ENUM_NAME = "descriptionformat"
_ENUM_VALUES = ("plain", "markdown", "html")


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
        desc_format_enum = postgresql.ENUM(*_ENUM_VALUES, name=_ENUM_NAME)
        desc_format_enum.create(conn)

    # 2. Add column if absent.
    existing_cols = {
        row[0]
        for row in conn.execute(
            sa.text(
                "SELECT column_name FROM information_schema.columns "
                "WHERE table_name = 'tasks'"
            )
        )
    }
    if "description_format" not in existing_cols:
        op.add_column(
            "tasks",
            sa.Column(
                "description_format",
                postgresql.ENUM(*_ENUM_VALUES, name=_ENUM_NAME, create_type=False),
                nullable=False,
                server_default="html",
            ),
        )


def downgrade() -> None:
    op.drop_column("tasks", "description_format")
    conn = op.get_bind()
    conn.execute(sa.text(f"DROP TYPE IF EXISTS {_ENUM_NAME}"))
