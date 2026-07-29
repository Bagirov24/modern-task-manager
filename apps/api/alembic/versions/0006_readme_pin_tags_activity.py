"""Migration 0006: readme, is_pinned, position, project_tag_definitions,
project_tags M2M, project_activity.

Revision ID: 0006_readme_pin_tags_activity
Revises: 0005_templates_members
Create Date: 2026-07-29

Idempotent: uses information_schema / pg_type checks before each DDL.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0006_readme_pin_tags_activity"
down_revision = "0005_templates_members"
branch_labels = None
depends_on = None

_README_ENUM = "readmeformat"
_README_VALUES = ("plain", "markdown", "html")


def _table_exists(conn, name: str) -> bool:
    return conn.execute(
        sa.text("SELECT 1 FROM information_schema.tables WHERE table_name=:t"),
        {"t": name},
    ).first() is not None


def _col_exists(conn, table: str, col: str) -> bool:
    return conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name=:t AND column_name=:c"
        ),
        {"t": table, "c": col},
    ).first() is not None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. readmeformat enum
    existing_enums = {
        r[0] for r in conn.execute(
            sa.text("SELECT typname FROM pg_type WHERE typcategory='E'")
        )
    }
    if _README_ENUM not in existing_enums:
        postgresql.ENUM(*_README_VALUES, name=_README_ENUM).create(conn)

    # 2. projects: readme, readme_format, is_pinned, position
    for col_name, col_def in [
        ("readme", sa.Column("readme", sa.Text, nullable=True)),
        (
            "readme_format",
            sa.Column(
                "readme_format",
                postgresql.ENUM(*_README_VALUES, name=_README_ENUM, create_type=False),
                nullable=False,
                server_default="html",
            ),
        ),
        ("is_pinned", sa.Column("is_pinned", sa.Boolean, nullable=False, server_default="false")),
        ("position", sa.Column("position", sa.Integer, nullable=False, server_default="0")),
    ]:
        if not _col_exists(conn, "projects", col_name):
            op.add_column("projects", col_def)

    # 3. project_tag_definitions
    if not _table_exists(conn, "project_tag_definitions"):
        op.create_table(
            "project_tag_definitions",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(50), nullable=False),
            sa.Column("slug", sa.String(60), nullable=False),
            sa.Column("color", sa.String(7), server_default="#38bdf8"),
            sa.Column("owner_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_project_tag_definitions_slug",
                        "project_tag_definitions", ["slug"])

    # 4. project_tags M2M
    if not _table_exists(conn, "project_tags"):
        op.create_table(
            "project_tags",
            sa.Column("project_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("projects.id", ondelete="CASCADE"),
                      primary_key=True),
            sa.Column("tag_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("project_tag_definitions.id", ondelete="CASCADE"),
                      primary_key=True),
        )

    # 5. project_activity
    if not _table_exists(conn, "project_activity"):
        op.create_table(
            "project_activity",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("action", sa.String(60), nullable=False),
            sa.Column("meta", postgresql.JSONB, nullable=False,
                      server_default="'{}'"),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("project_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("projects.id", ondelete="CASCADE"),
                      nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("users.id", ondelete="SET NULL"),
                      nullable=True),
        )
        op.create_index("ix_project_activity_project_id",
                        "project_activity", ["project_id"])
        op.create_index("ix_project_activity_created_at",
                        "project_activity", ["created_at"])


def downgrade() -> None:
    op.drop_table("project_activity")
    op.drop_table("project_tags")
    op.drop_table("project_tag_definitions")
    op.drop_column("projects", "position")
    op.drop_column("projects", "is_pinned")
    op.drop_column("projects", "readme_format")
    op.drop_column("projects", "readme")
    conn = op.get_bind()
    conn.execute(sa.text(f"DROP TYPE IF EXISTS {_README_ENUM}"))
