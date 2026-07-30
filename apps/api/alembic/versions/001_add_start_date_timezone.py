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
    conn = op.get_bind()
    if not sa.inspect(conn).has_table('tasks'):
        # The repository predates Alembic's baseline migration. Bootstrap the
        # original core schema so a fresh database can run the full chain.
        from app.core.database import Base
        import app.models  # noqa: F401

        Base.metadata.create_all(bind=conn)
        return

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
