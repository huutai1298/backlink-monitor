"""add telegram_message_id and telegram_chat_id to notification_logs

Revision ID: 003
Revises: 002
Create Date: 2026-03-04

"""
from alembic import op
import sqlalchemy as sa

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "notification_logs",
        sa.Column("telegram_message_id", sa.BigInteger(), nullable=True),
    )
    op.add_column(
        "notification_logs",
        sa.Column("telegram_chat_id", sa.String(64), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("notification_logs", "telegram_chat_id")
    op.drop_column("notification_logs", "telegram_message_id")
