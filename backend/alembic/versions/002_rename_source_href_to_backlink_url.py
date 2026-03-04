"""rename source_href to backlink_url in backlinks table

Revision ID: 002
Revises: 001
Create Date: 2026-03-04

"""
from alembic import op
import sqlalchemy as sa

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "backlinks",
        "source_href",
        new_column_name="backlink_url",
        existing_type=sa.String(2048),
        type_=sa.String(500),
        nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "backlinks",
        "backlink_url",
        new_column_name="source_href",
        existing_type=sa.String(500),
        type_=sa.String(2048),
        nullable=False,
    )
