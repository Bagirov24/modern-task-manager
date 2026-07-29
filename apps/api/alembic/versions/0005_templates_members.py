"""Migration 0005: project_templates, template_sections, template_tasks,
project_members tables + memberrole enum.

Revision ID: 0005_templates_members
Revises: 0004_project_status_dates
Create Date: 2026-07-29

Idempotent: checks information_schema before each CREATE TABLE.
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0005_templates_members"
down_revision = "0004_project_status_dates"
branch_labels = None
depends_on = None

_MEMBER_ROLE_ENUM = "memberrole"
_MEMBER_ROLE_VALUES = ("viewer", "editor", "admin")


def _table_exists(conn, table_name: str) -> bool:
    row = conn.execute(
        sa.text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_name = :t"
        ),
        {"t": table_name},
    ).first()
    return row is not None


def upgrade() -> None:
    conn = op.get_bind()

    # 1. memberrole enum
    existing_enums = {
        r[0] for r in conn.execute(
            sa.text("SELECT typname FROM pg_type WHERE typcategory = 'E'")
        )
    }
    if _MEMBER_ROLE_ENUM not in existing_enums:
        postgresql.ENUM(*_MEMBER_ROLE_VALUES, name=_MEMBER_ROLE_ENUM).create(conn)

    # 2. project_templates
    if not _table_exists(conn, "project_templates"):
        op.create_table(
            "project_templates",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("description", sa.Text),
            sa.Column("icon", sa.String(50), server_default="📋"),
            sa.Column("color", sa.String(7), server_default="#38bdf8"),
            sa.Column("is_public", sa.Boolean, nullable=False, server_default="false"),
            sa.Column("owner_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )

    # 3. template_sections
    if not _table_exists(conn, "template_sections"):
        op.create_table(
            "template_sections",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("position", sa.Integer, nullable=False, server_default="0"),
            sa.Column("template_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("project_templates.id", ondelete="CASCADE"),
                      nullable=False),
        )

    # 4. template_tasks
    if not _table_exists(conn, "template_tasks"):
        op.create_table(
            "template_tasks",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column("title", sa.String(500), nullable=False),
            sa.Column("description", sa.Text),
            sa.Column("priority", sa.String(20), server_default="medium"),
            sa.Column("position", sa.Integer, nullable=False, server_default="0"),
            sa.Column("relative_days", sa.Integer, nullable=True),
            sa.Column("section_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("template_sections.id", ondelete="CASCADE"),
                      nullable=False),
        )

    # 5. project_members
    if not _table_exists(conn, "project_members"):
        op.create_table(
            "project_members",
            sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
            sa.Column(
                "role",
                postgresql.ENUM(*_MEMBER_ROLE_VALUES,
                                name=_MEMBER_ROLE_ENUM, create_type=False),
                nullable=False,
                server_default="editor",
            ),
            sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("project_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
            sa.Column("user_id", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("invited_by", postgresql.UUID(as_uuid=True),
                      sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.UniqueConstraint("project_id", "user_id", name="uq_project_members"),
        )
        op.create_index("ix_project_members_project_id", "project_members", ["project_id"])
        op.create_index("ix_project_members_user_id", "project_members", ["user_id"])


def downgrade() -> None:
    op.drop_table("project_members")
    op.drop_table("template_tasks")
    op.drop_table("template_sections")
    op.drop_table("project_templates")
    conn = op.get_bind()
    conn.execute(sa.text(f"DROP TYPE IF EXISTS {_MEMBER_ROLE_ENUM}"))
