"""Add start_date and make all datetime columns timezone-aware.

Revision ID: 001_add_start_date_timezone
Revises: (initial)
Create Date: 2026-07-29

Run: alembic upgrade head
"""
from alembic import op
import sqlalchemy as sa

revision = '001_add_start_date_timezone'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add start_date column to tasks
    op.add_column(
        'tasks',
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=True),
    )

    # Convert existing DateTime columns to timezone-aware (AT TIME ZONE 'UTC')
    for table, column in [
        ('tasks', 'created_at'),
        ('tasks', 'updated_at'),
        ('tasks', 'due_date'),
        ('tasks', 'completed_at'),
        ('projects', 'created_at'),
        ('projects', 'updated_at'),
        ('users', 'created_at'),
    ]:
        op.alter_column(
            table,
            column,
            type_=sa.DateTime(timezone=True),
            existing_type=sa.DateTime(timezone=False),
            postgresql_using=f"{column} AT TIME ZONE 'UTC'",
        )


def downgrade() -> None:
    op.drop_column('tasks', 'start_date')

    for table, column in [
        ('tasks', 'created_at'),
        ('tasks', 'updated_at'),
        ('tasks', 'due_date'),
        ('tasks', 'completed_at'),
        ('projects', 'created_at'),
        ('projects', 'updated_at'),
        ('users', 'created_at'),
    ]:
        op.alter_column(
            table,
            column,
            type_=sa.DateTime(timezone=False),
            existing_type=sa.DateTime(timezone=True),
        )
