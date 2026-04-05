"""Add CMS (static_pages, sitemap_entries), Wallet/Payout, and Messaging gaps

Revision ID: 0003
Revises: 0002
Create Date: 2026-04-02
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def _uuid_col(is_sqlite: bool):
    return sa.String(36) if is_sqlite else UUID(as_uuid=True)


def _uuid_pk(is_sqlite: bool):
    if is_sqlite:
        return sa.Column("id", sa.String(36), primary_key=True)
    return sa.Column(
        "id",
        UUID(as_uuid=True),
        primary_key=True,
        server_default=sa.text("gen_random_uuid()"),
    )


def upgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"
    _id = _uuid_col(is_sqlite)

    # ── wallets ───────────────────────────────────────────────────────────────
    op.create_table(
        "wallets",
        _uuid_pk(is_sqlite),
        sa.Column("user_id",    _id, sa.ForeignKey("users.id", ondelete="CASCADE"),
                  unique=True, nullable=False),
        sa.Column("balance",    sa.Numeric(12, 2), nullable=False, server_default="0.00"),
        sa.Column("currency",   sa.String(3),  nullable=False, server_default="USD"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_wallets_user", "wallets", ["user_id"], unique=True)

    # ── withdrawal_requests ───────────────────────────────────────────────────
    op.create_table(
        "withdrawal_requests",
        _uuid_pk(is_sqlite),
        sa.Column("wallet_id",    _id, sa.ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount",       sa.Numeric(12, 2), nullable=False),
        sa.Column("method",       sa.String(50),     nullable=False),
        sa.Column("details",      sa.Text,           nullable=True),   # JSON
        sa.Column("status",       sa.String(20),     nullable=False, server_default="requested"),
        sa.Column("admin_notes",  sa.Text,           nullable=True),
        sa.Column("requested_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processed_by", _id, sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("idx_withdrawal_wallet",    "withdrawal_requests", ["wallet_id"])
    op.create_index("idx_withdrawal_status",    "withdrawal_requests", ["status"])

    # ── wallet_transactions ───────────────────────────────────────────────────
    op.create_table(
        "wallet_transactions",
        _uuid_pk(is_sqlite),
        sa.Column("wallet_id",        _id, sa.ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order_id",         _id, sa.ForeignKey("orders.id"),              nullable=True),
        sa.Column("withdrawal_id",    _id, sa.ForeignKey("withdrawal_requests.id"), nullable=True),
        sa.Column("amount",           sa.Numeric(12, 2), nullable=False),
        sa.Column("transaction_type", sa.String(20),     nullable=False),
        sa.Column("description",      sa.Text,           nullable=False),
        sa.Column("reference_id",     sa.String(255),    nullable=False, unique=True),
        sa.Column("status",           sa.String(20),     server_default="success"),
        sa.Column("created_at",       sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_wallet_txn_wallet",  "wallet_transactions", ["wallet_id", "created_at"])
    op.create_index("idx_wallet_txn_ref",     "wallet_transactions", ["reference_id"], unique=True)

    # ── static_pages ──────────────────────────────────────────────────────────
    op.create_table(
        "static_pages",
        _uuid_pk(is_sqlite),
        sa.Column("title",           sa.String(200), nullable=False),
        sa.Column("slug",            sa.String(200), nullable=False, unique=True),
        sa.Column("content",         sa.Text,        nullable=False),
        sa.Column("seo_title",       sa.String(255), nullable=True),
        sa.Column("seo_description", sa.Text,        nullable=True),
        sa.Column("meta_keywords",   sa.String(500), nullable=True),
        sa.Column("og_image_url",    sa.Text,        nullable=True),
        sa.Column("is_published",    sa.Boolean,     server_default="1"),
        sa.Column("published_at",    sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at",      sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at",      sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("created_by",      _id, sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("idx_static_pages_slug",    "static_pages", ["slug"],         unique=True)
    op.create_index("idx_static_pages_publish", "static_pages", ["is_published"])

    # ── sitemap_entries ───────────────────────────────────────────────────────
    op.create_table(
        "sitemap_entries",
        _uuid_pk(is_sqlite),
        sa.Column("url",        sa.Text,           nullable=False, unique=True),
        sa.Column("changefreq", sa.String(20),    server_default="weekly"),
        sa.Column("priority",   sa.Numeric(2, 1), server_default="0.5"),
        sa.Column("lastmod",    sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("is_active",  sa.Boolean,       server_default="1"),
    )

    # ── message_threads ───────────────────────────────────────────────────────
    op.create_table(
        "message_threads",
        _uuid_pk(is_sqlite),
        sa.Column("buyer_id",      _id, sa.ForeignKey("users.id"),   nullable=False),
        sa.Column("seller_id",     _id, sa.ForeignKey("users.id"),   nullable=False),
        sa.Column("order_id",      _id, sa.ForeignKey("orders.id"),  nullable=True),   # NULL = pre-order
        sa.Column("gig_id",        _id, sa.ForeignKey("gigs.id"),    nullable=True),
        sa.Column("subject",       sa.String(200), nullable=True),
        sa.Column("last_message",  sa.Text,        nullable=True),
        sa.Column("last_msg_at",   sa.DateTime(timezone=True), nullable=True),
        sa.Column("buyer_unread",  sa.Integer,     server_default="0"),
        sa.Column("seller_unread", sa.Integer,     server_default="0"),
        sa.Column("is_archived",   sa.Boolean,     server_default="0"),
        sa.Column("created_at",    sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_thread_buyer",  "message_threads", ["buyer_id",  "last_msg_at"])
    op.create_index("idx_thread_seller", "message_threads", ["seller_id", "last_msg_at"])
    op.create_index("idx_thread_order",  "message_threads", ["order_id"])

    # Unique constraint: only ONE thread per buyer-seller pair (unless order-specific)
    if not is_sqlite:
        if op.get_context().dialect.name == "postgresql":
            op.execute("""
                CREATE UNIQUE INDEX idx_thread_pair_no_order
                ON message_threads(buyer_id, seller_id)
                WHERE order_id IS NULL
            """)

    # ── inbox_messages ────────────────────────────────────────────────────────
    op.create_table(
        "inbox_messages",
        _uuid_pk(is_sqlite),
        sa.Column("thread_id",      _id, sa.ForeignKey("message_threads.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id",      _id, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body",           sa.Text,    nullable=False),
        sa.Column("attachment_url", sa.Text,    nullable=True),
        sa.Column("is_read",        sa.Boolean, server_default="0"),
        sa.Column("created_at",     sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_inbox_msg_thread", "inbox_messages", ["thread_id", "created_at"])


def downgrade() -> None:
    for table in [
        "inbox_messages",
        "message_threads",
        "sitemap_entries",
        "static_pages",
        "wallet_transactions",
        "withdrawal_requests",
        "wallets",
    ]:
        op.drop_table(table)
