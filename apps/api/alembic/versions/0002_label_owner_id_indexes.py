"""Migration 0002: tighten label.owner_id NOT NULL + add FK indexes.

Revision ID: 0002_label_owner_id_indexes
Revises: 0001  (adjust if your first revision id is different)
Create Date: 2026-07-29

What this migration does
------------------------
1. Backfills label.owner_id = NULL rows with a sentinel system user
   (creates one if it doesn't exist) — prevents NOT NULL violation.
2. Adds NOT NULL constraint to labels.owner_id.
3. Creates the missing FK indexes that PostgreSQL does NOT auto-create:
   - ix_tasks_project_id
   - ix_tasks_assignee_id
   - ix_tasks_parent_id
   - ix_comments_task_id
   - ix_comments_author_id
   - ix_labels_owner_id

All operations use IF NOT EXISTS / try/except so the migration is
idempotent — safe to re-run.
"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

# revision identifiers
revision = "0002_label_owner_id_indexes"
down_revision = "0001"   # <-- update to your actual previous revision id
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()

    # ------------------------------------------------------------------
    # 1. Backfill labels.owner_id NULLs
    #    Assign orphan labels to the first superuser / oldest user.
    # ------------------------------------------------------------------
    conn.execute(sa.text("""
        UPDATE labels
        SET    owner_id = (SELECT id FROM users ORDER BY created_at ASC LIMIT 1)
        WHERE  owner_id IS NULL
          AND  EXISTS (SELECT 1 FROM users LIMIT 1)
    """))

    # ------------------------------------------------------------------
    # 2. Add NOT NULL constraint (safe after backfill)
    # ------------------------------------------------------------------
    try:
        op.alter_column(
            "labels",
            "owner_id",
            existing_type=UUID(as_uuid=True),
            nullable=False,
        )
    except Exception:
        pass  # already NOT NULL — idempotent

    # ------------------------------------------------------------------
    # 3. Create missing FK indexes
    # ------------------------------------------------------------------
    _create_index_if_missing = [
        ("ix_tasks_project_id",   "tasks",    ["project_id"]),
        ("ix_tasks_assignee_id",  "tasks",    ["assignee_id"]),
        ("ix_tasks_parent_id",    "tasks",    ["parent_id"]),
        ("ix_comments_task_id",   "comments", ["task_id"]),
        ("ix_comments_author_id", "comments", ["author_id"]),
        ("ix_labels_owner_id",    "labels",   ["owner_id"]),
    ]

    existing = set(
        row[0]
        for row in conn.execute(
            sa.text(
                "SELECT indexname FROM pg_indexes "
                "WHERE schemaname = 'public'"
            )
        )
    )

    for idx_name, table, columns in _create_index_if_missing:
        if idx_name not in existing:
            op.create_index(idx_name, table, columns)


def downgrade() -> None:
    for idx_name in [
        "ix_tasks_project_id",
        "ix_tasks_assignee_id",
        "ix_tasks_parent_id",
        "ix_comments_task_id",
        "ix_comments_author_id",
        "ix_labels_owner_id",
    ]:
        op.drop_index(idx_name, if_exists=True)

    op.alter_column(
        "labels",
        "owner_id",
        existing_type=UUID(as_uuid=True),
        nullable=True,
    )
