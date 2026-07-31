"""Add useful workspace links and task associations.

Revision ID: 0008_workspace_links
Revises: 0007_workspace_context
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0008_workspace_links"
down_revision = "0007_workspace_context"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "workspace_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("environment", sa.String(50), nullable=True),
        sa.Column("login", sa.String(255), nullable=True),
        sa.Column("access_status", sa.String(30), nullable=False, server_default="has_access"),
        sa.Column("access_hint", sa.String(500), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("tags", sa.JSON(), nullable=False, server_default=sa.text("'[]'::json")),
        sa.Column("is_favorite", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    for column in ("workspace_id", "project_id", "category", "is_favorite", "created_by"):
        op.create_index(f"ix_workspace_links_{column}", "workspace_links", [column])
    op.execute("CREATE INDEX ix_workspace_links_search ON workspace_links USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'') || ' ' || coalesce(notes,'')))")
    op.create_table(
        "task_workspace_links",
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("workspace_link_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("workspace_links.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_task_workspace_links_link_id", "task_workspace_links", ["workspace_link_id"])


def downgrade() -> None:
    op.drop_table("task_workspace_links")
    op.drop_index("ix_workspace_links_search", table_name="workspace_links")
    op.drop_table("workspace_links")
