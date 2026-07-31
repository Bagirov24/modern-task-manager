"""Add workflow context, documents and safe test-data catalog.

Revision ID: 0007_workspace_context
Revises: 0006_readme_pin_tags_activity
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0007_workspace_context"
down_revision = "0006_readme_pin_tags_activity"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("workflow_config", sa.JSON(), nullable=False, server_default=sa.text("'{\"type\":\"standard\",\"statuses\":[\"inbox\",\"backlog\",\"ready\",\"in_progress\",\"review\",\"done\",\"cancelled\"]}'::json")))

    op.add_column("tasks", sa.Column("workflow_status", sa.String(30), nullable=False, server_default="backlog"))
    op.add_column("tasks", sa.Column("is_blocked", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("tasks", sa.Column("blocked_reason", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("blocked_by_task_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("tasks", sa.Column("context", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("expected_result", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("acceptance_criteria", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("next_action", sa.Text(), nullable=True))
    op.add_column("tasks", sa.Column("estimate_minutes", sa.Integer(), nullable=True))
    op.add_column("tasks", sa.Column("milestone", sa.String(255), nullable=True))
    op.add_column("tasks", sa.Column("sprint", sa.String(255), nullable=True))
    op.create_foreign_key("fk_tasks_blocked_by_task_id", "tasks", "tasks", ["blocked_by_task_id"], ["id"], ondelete="SET NULL")
    op.create_index("ix_tasks_workflow_status", "tasks", ["workflow_status"])
    op.create_index("ix_tasks_is_blocked", "tasks", ["is_blocked"])

    op.create_table(
        "documents",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="CASCADE"), nullable=True),
        sa.Column("parent_document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("slug", sa.String(550), nullable=False),
        sa.Column("content_markdown", sa.Text(), nullable=False, server_default=""),
        sa.Column("document_type", sa.String(50), nullable=False, server_default="brief"),
        sa.Column("status", sa.String(30), nullable=False, server_default="draft"),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("is_template", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=True),
    )
    for column in ("workspace_id", "project_id", "task_id", "owner_id"):
        op.create_index(f"ix_documents_{column}", "documents", [column])
    op.execute("CREATE INDEX ix_documents_search ON documents USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(content_markdown,'')))")

    op.create_table(
        "document_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("link_type", sa.String(40), nullable=False, server_default="related"),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )
    op.create_index("ix_document_links_document_id", "document_links", ["document_id"])
    op.create_table(
        "document_attachments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("storage_key", sa.String(1000), nullable=False, unique=True),
        sa.Column("original_name", sa.String(500), nullable=False),
        sa.Column("mime_type", sa.String(255), nullable=False),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("checksum", sa.String(128), nullable=False),
        sa.Column("uploaded_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_document_attachments_document_id", "document_attachments", ["document_id"])
    op.create_table(
        "document_permissions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject_type", sa.String(30), nullable=False),
        sa.Column("subject_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("permission", sa.String(20), nullable=False, server_default="view"),
        sa.UniqueConstraint("document_id", "subject_type", "subject_id", name="uq_document_permission_subject"),
    )
    op.create_table(
        "document_versions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("document_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("documents.id", ondelete="CASCADE"), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("content_markdown", sa.Text(), nullable=False),
        sa.Column("changed_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("change_summary", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("document_id", "version", name="uq_document_version"),
    )
    op.create_index("ix_document_versions_document_id", "document_versions", ["document_id"])

    op.create_table(
        "test_data_sets",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=True),
        sa.Column("name", sa.String(500), nullable=False),
        sa.Column("category", sa.String(30), nullable=False),
        sa.Column("environment", sa.String(30), nullable=False),
        sa.Column("sensitivity", sa.String(30), nullable=False, server_default="internal"),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    for column in ("workspace_id", "project_id", "owner_id"):
        op.create_index(f"ix_test_data_sets_{column}", "test_data_sets", [column])
    op.create_index("ix_test_data_sets_environment", "test_data_sets", ["environment"])
    op.create_index("ix_test_data_sets_sensitivity", "test_data_sets", ["sensitivity"])
    op.create_table(
        "test_data_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("test_data_set_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("test_data_sets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(500), nullable=False),
        sa.Column("item_type", sa.String(30), nullable=False),
        sa.Column("display_value", sa.Text(), nullable=True),
        sa.Column("vault_provider", sa.String(100), nullable=True),
        sa.Column("vault_reference", sa.String(1000), nullable=True),
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
        sa.Column("rotation_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_test_data_items_test_data_set_id", "test_data_items", ["test_data_set_id"])
    op.create_table(
        "test_data_access_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("test_data_item_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("test_data_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_test_data_access_logs_test_data_item_id", "test_data_access_logs", ["test_data_item_id"])


def downgrade() -> None:
    for table in ("test_data_access_logs", "test_data_items", "test_data_sets", "document_versions", "document_permissions", "document_attachments", "document_links", "documents"):
        op.drop_table(table)
    op.drop_index("ix_tasks_is_blocked", table_name="tasks")
    op.drop_index("ix_tasks_workflow_status", table_name="tasks")
    op.drop_constraint("fk_tasks_blocked_by_task_id", "tasks", type_="foreignkey")
    for column in ("sprint", "milestone", "estimate_minutes", "next_action", "acceptance_criteria", "expected_result", "context", "blocked_by_task_id", "blocked_reason", "is_blocked", "workflow_status"):
        op.drop_column("tasks", column)
    op.drop_column("projects", "workflow_config")
