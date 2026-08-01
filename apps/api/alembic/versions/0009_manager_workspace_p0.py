"""Add manager commitments, Action Inbox and document confidentiality.

Revision ID: 0009_manager_workspace_p0
Revises: 0008_workspace_links
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "0009_manager_workspace_p0"
down_revision = "0008_workspace_links"
branch_labels = None
depends_on = None


def upgrade() -> None:
    task_columns = (
        sa.Column("task_type", sa.String(40), nullable=False, server_default="task"),
        sa.Column("manager_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("final_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("response_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("next_action_owner_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("next_action_description", sa.Text(), nullable=True),
        sa.Column("next_action_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("waiting_for_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("waiting_for_party", sa.String(20), nullable=False, server_default="none"),
        sa.Column("follow_up_action_description", sa.Text(), nullable=True),
        sa.Column("risk_level", sa.String(20), nullable=False, server_default="low"),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("last_external_communication_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("communication_channel", sa.String(30), nullable=True),
    )
    for column in task_columns:
        op.add_column("tasks", column)
    for column in ("manager_id", "next_action_owner_id", "waiting_for_user_id"):
        op.create_foreign_key(f"fk_tasks_{column}", "tasks", "users", [column], ["id"], ondelete="SET NULL")
        op.create_index(f"ix_tasks_{column}", "tasks", [column])
    for column in ("final_due_at", "response_due_at", "next_action_due_at", "risk_level", "task_type"):
        op.create_index(f"ix_tasks_{column}", "tasks", [column])
    op.execute("UPDATE tasks SET final_due_at = due_date WHERE final_due_at IS NULL")
    op.execute("UPDATE tasks SET next_action_description = next_action WHERE next_action_description IS NULL")
    op.execute("UPDATE tasks SET manager_id = assignee_id WHERE manager_id IS NULL")

    op.add_column("documents", sa.Column("confidentiality_level", sa.String(30), nullable=False, server_default="internal"))
    op.add_column("documents", sa.Column("source_communication_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_index("ix_documents_confidentiality_level", "documents", ["confidentiality_level"])

    op.create_table(
        "communication_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("workspace_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("project_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="SET NULL"), nullable=True),
        sa.Column("task_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tasks.id", ondelete="SET NULL"), nullable=True),
        sa.Column("parent_communication_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("communication_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("source_type", sa.String(20), nullable=False, server_default="manual"),
        sa.Column("source_message_id", sa.String(255), nullable=True),
        sa.Column("source_thread_id", sa.String(255), nullable=True),
        sa.Column("sender_name", sa.String(255), nullable=False),
        sa.Column("sender_role", sa.String(30), nullable=False, server_default="other"),
        sa.Column("direction", sa.String(20), nullable=False, server_default="incoming"),
        sa.Column("subject", sa.String(500), nullable=True),
        sa.Column("body_preview", sa.Text(), nullable=False),
        sa.Column("source_url", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("action_status", sa.String(30), nullable=False, server_default="new"),
        sa.Column("action_owner_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("response_due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("waiting_for_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("waiting_for_party", sa.String(20), nullable=False, server_default="none"),
        sa.Column("next_action", sa.Text(), nullable=True),
        sa.Column("needs_reply", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("importance", sa.String(20), nullable=False, server_default="normal"),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("created_by", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("closed_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("source_type", "source_message_id", name="uq_communication_source_message"),
    )
    for column in ("project_id", "task_id", "action_owner_id", "action_status", "response_due_at"):
        op.create_index(f"ix_communication_items_{column}", "communication_items", [column])
    op.execute("CREATE INDEX ix_communication_items_search ON communication_items USING gin (to_tsvector('simple', coalesce(subject,'') || ' ' || coalesce(body_preview,'') || ' ' || coalesce(next_action,'')))")
    op.create_foreign_key("fk_documents_source_communication_id", "documents", "communication_items", ["source_communication_id"], ["id"], ondelete="SET NULL")


def downgrade() -> None:
    op.drop_constraint("fk_documents_source_communication_id", "documents", type_="foreignkey")
    op.drop_table("communication_items")
    op.drop_column("documents", "source_communication_id")
    op.drop_column("documents", "confidentiality_level")
    for column in ("communication_channel", "last_external_communication_at", "last_activity_at", "risk_level", "follow_up_action_description", "waiting_for_party", "waiting_for_user_id", "next_action_due_at", "next_action_description", "next_action_owner_id", "response_due_at", "final_due_at", "manager_id", "task_type"):
        op.drop_column("tasks", column)
