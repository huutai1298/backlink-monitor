"""create all tables

Revision ID: 001
Revises:
Create Date: 2026-03-03

"""
from alembic import op
import sqlalchemy as sa

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "customers",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("telegram_group_id", sa.String(100), nullable=True),
        sa.Column("telegram_group_url", sa.String(255), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "websites",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("domain", sa.String(255), nullable=False),
        sa.Column("price_monthly", sa.DECIMAL(15, 2), nullable=True, server_default="0"),
        sa.Column("category", sa.String(100), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_dead", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("dead_since", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, onupdate=sa.func.now()),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("domain"),
    )
    op.create_index("idx_is_dead", "websites", ["is_dead"])
    op.create_index("idx_domain_ft", "websites", ["domain"], mysql_prefix="FULLTEXT")

    op.create_table(
        "backlinks",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("customer_id", sa.Integer(), nullable=False),
        sa.Column("website_id", sa.Integer(), nullable=False),
        sa.Column("source_href", sa.String(2048), nullable=False),
        sa.Column("anchor_text", sa.String(500), nullable=True),
        sa.Column("target_url", sa.String(2048), nullable=True),
        sa.Column("date_placed", sa.Date(), nullable=True),
        sa.Column("date_payment", sa.Date(), nullable=True),
        sa.Column(
            "status",
            sa.Enum("pending", "live", "lost", "expired", "inactive"),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("last_checked", sa.DateTime(), nullable=True),
        sa.Column("last_live_at", sa.DateTime(), nullable=True),
        sa.Column("lost_at", sa.DateTime(), nullable=True),
        sa.Column("inactive_notified_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"]),
        sa.ForeignKeyConstraint(["website_id"], ["websites.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_website_id", "backlinks", ["website_id"])
    op.create_index("idx_customer_id", "backlinks", ["customer_id"])
    op.create_index("idx_status", "backlinks", ["status"])
    op.create_index("idx_customer_status", "backlinks", ["customer_id", "status"])
    op.create_index("idx_date_payment", "backlinks", ["date_payment"])

    op.create_table(
        "blacklisted_links",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("website_id", sa.Integer(), nullable=False),
        sa.Column("blacklist_url", sa.String(2048), nullable=False),
        sa.Column("anchor_text", sa.String(500), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(), nullable=True, onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(["website_id"], ["websites.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_blacklist_website_id", "blacklisted_links", ["website_id"])
    op.create_index("idx_blacklist_is_active", "blacklisted_links", ["is_active"])

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("backlink_id", sa.Integer(), nullable=True),
        sa.Column("website_id", sa.Integer(), nullable=True),
        sa.Column("customer_id", sa.Integer(), nullable=True),
        sa.Column(
            "type",
            sa.Enum("lost", "live", "inactive_still_live", "website_die", "website_alive"),
            nullable=False,
        ),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("sent_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.Column("created_at", sa.DateTime(), nullable=True, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(["backlink_id"], ["backlinks.id"]),
        sa.ForeignKeyConstraint(["website_id"], ["websites.id"]),
        sa.ForeignKeyConstraint(["customer_id"], ["customers.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("notification_logs")
    op.drop_index("idx_date_payment", table_name="backlinks")
    op.drop_index("idx_customer_status", table_name="backlinks")
    op.drop_index("idx_status", table_name="backlinks")
    op.drop_index("idx_customer_id", table_name="backlinks")
    op.drop_index("idx_website_id", table_name="backlinks")
    op.drop_table("backlinks")
    op.drop_index("idx_blacklist_is_active", table_name="blacklisted_links")
    op.drop_index("idx_blacklist_website_id", table_name="blacklisted_links")
    op.drop_table("blacklisted_links")
    op.drop_index("idx_domain_ft", table_name="websites")
    op.drop_index("idx_is_dead", table_name="websites")
    op.drop_table("websites")
    op.drop_table("customers")
