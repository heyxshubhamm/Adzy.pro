"""Initial schema — Postgres extensions, core tables, GIN indexes.

Revision ID: 0001
Revises:
Create Date: 2026-03-30
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    is_sqlite = bind.dialect.name == "sqlite"

    if not is_sqlite:
        # ── Postgres extensions ───────────────────────────────────────────────
        if op.get_context().dialect.name == "postgresql": op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')
        if op.get_context().dialect.name == "postgresql": op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
        if op.get_context().dialect.name == "postgresql": op.execute("CREATE EXTENSION IF NOT EXISTS unaccent")
        if op.get_context().dialect.name == "postgresql": op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    # ── categories ───────────────────────────────────────────────────────────
    op.create_table(
        "categories",
        sa.Column("id",         UUID(as_uuid=True) if not is_sqlite else sa.String(36),
                  primary_key=True,
                  server_default=sa.text("gen_random_uuid()") if not is_sqlite else sa.text("(lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6))))")),
        sa.Column("name",       sa.String(120), nullable=False),
        sa.Column("slug",       sa.String(120), nullable=False, unique=True),
        sa.Column("parent_id",  sa.String(36) if is_sqlite else UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_categories_slug", "categories", ["slug"], unique=True)

    # ── users ─────────────────────────────────────────────────────────────────
    op.create_table(
        "users",
        sa.Column("id",               UUID(as_uuid=True) if not is_sqlite else sa.String(36), primary_key=True),
        sa.Column("email",            sa.String(255), nullable=False, unique=True),
        sa.Column("username",         sa.String(50),  nullable=False, unique=True),
        sa.Column("hashed_password",  sa.Text,        nullable=False),
        sa.Column("role",             sa.String(20),  nullable=False, server_default="buyer"),
        sa.Column("is_active",        sa.Boolean,     nullable=False, server_default="1"),
        sa.Column("is_verified",      sa.Boolean,     nullable=False, server_default="0"),
        sa.Column("avatar_url",       sa.Text,        nullable=True),
        sa.Column("publisher_level",  sa.Integer,     nullable=False, server_default="0"),
        sa.Column("adzy_choice",      sa.Boolean,     nullable=False, server_default="0"),
        sa.Column("seller_score",     sa.Numeric(5, 2), nullable=True),
        sa.Column("completion_rate",  sa.Numeric(5, 2), server_default="100.0"),
        sa.Column("on_time_delivery_rate", sa.Numeric(5, 2), server_default="100.0"),
        sa.Column("response_speed_seconds", sa.Integer, server_default="3600"),
        sa.Column("last_level_eval",  sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_active_at",   sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("total_orders_completed", sa.Integer, server_default="0"),
        sa.Column("created_at",       sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at",       sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_users_email",    "users", ["email"],    unique=True)
    op.create_index("idx_users_username", "users", ["username"], unique=True)

    # ── gigs ──────────────────────────────────────────────────────────────────
    _col_id = UUID(as_uuid=True) if not is_sqlite else sa.String(36)
    op.create_table(
        "gigs",
        sa.Column("id",            _col_id,            primary_key=True),
        sa.Column("seller_id",     sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id",   sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("categories.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title",         sa.String(80),  nullable=False),
        sa.Column("slug",          sa.String(120), nullable=False, unique=True),
        sa.Column("description",   sa.Text,        nullable=False),
        sa.Column("subcategory",   sa.String(100), nullable=True),
        sa.Column("tags",          sa.Text,        nullable=True),      # JSON array in SQLite
        sa.Column("status",        sa.String(20),  nullable=False, server_default="draft"),
        sa.Column("views",         sa.Integer,     nullable=False, server_default="0"),
        sa.Column("rating",        sa.Numeric(3, 2), nullable=True),
        sa.Column("reviews_count", sa.Integer,     nullable=False, server_default="0"),
        sa.Column("risk_score",    sa.Numeric(5, 2), server_default="0"),
        sa.Column("risk_report",   sa.Text,        nullable=True),
        sa.Column("gig_level",     sa.String(20),  server_default="standard"),
        sa.Column("orders_last_7d", sa.Integer,    server_default="0"),
        sa.Column("ctr_7d",        sa.Numeric(6, 4), server_default="0"),
        sa.Column("conversion_7d", sa.Numeric(6, 4), server_default="0"),
        sa.Column("created_at",    sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at",    sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_gigs_slug",            "gigs", ["slug"],                       unique=True)
    op.create_index("idx_gigs_seller_status",   "gigs", ["seller_id",   "status"])
    op.create_index("idx_gigs_category_status", "gigs", ["category_id", "status"])

    if not is_sqlite:
        # GIN index for tag array search
        if op.get_context().dialect.name == "postgresql": op.execute("CREATE INDEX idx_gigs_tags_gin ON gigs USING gin(tags)")
        # Full-text search index
        if op.get_context().dialect.name == "postgresql": op.execute("""
            CREATE INDEX idx_gigs_fts ON gigs
            USING gin(to_tsvector('english',
                coalesce(title,'') || ' ' || coalesce(description,'')))
        """)
        # Trigram index for ILIKE title search
        if op.get_context().dialect.name == "postgresql": op.execute("CREATE INDEX idx_gigs_title_trgm ON gigs USING gin(title gin_trgm_ops)")

    # ── gig_packages ──────────────────────────────────────────────────────────
    op.create_table(
        "gig_packages",
        sa.Column("id",           _col_id,          primary_key=True),
        sa.Column("gig_id",       sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("gigs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tier",         sa.String(10),  nullable=False),
        sa.Column("name",         sa.String(80),  nullable=False),
        sa.Column("description",  sa.Text,        nullable=False),
        sa.Column("price",        sa.Numeric(10, 2), nullable=False),
        sa.Column("delivery_days", sa.Integer,    nullable=False),
        sa.Column("revisions",    sa.Integer,     server_default="1"),
        sa.Column("features",     sa.Text,        nullable=True),       # JSON array
    )
    op.create_index("idx_gig_packages_gig", "gig_packages", ["gig_id"])

    # ── gig_requirements ──────────────────────────────────────────────────────
    op.create_table(
        "gig_requirements",
        sa.Column("id",         _col_id,          primary_key=True),
        sa.Column("gig_id",     sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("gigs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question",   sa.Text,       nullable=False),
        sa.Column("input_type", sa.String(20), server_default="text"),
        sa.Column("choices",    sa.Text,       nullable=True),           # JSON array
        sa.Column("is_required", sa.Boolean,  server_default="1"),
        sa.Column("sort_order", sa.Integer,   server_default="0"),
    )

    # ── gig_media ─────────────────────────────────────────────────────────────
    op.create_table(
        "gig_media",
        sa.Column("id",             _col_id,      primary_key=True),
        sa.Column("gig_id",         sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("gigs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("media_type",     sa.String(10), nullable=False),
        sa.Column("raw_key",        sa.Text,       nullable=False),
        sa.Column("processed_key",  sa.Text,       nullable=True),
        sa.Column("url",            sa.Text,       nullable=False),
        sa.Column("processed_urls", sa.Text,       nullable=True),        # JSONB on PG
        sa.Column("status",         sa.String(20), server_default="processing"),
        sa.Column("sort_order",     sa.Integer,    server_default="0"),
        sa.Column("is_cover",       sa.Boolean,    server_default="0"),
    )
    op.create_index("idx_gig_media_gig", "gig_media", ["gig_id"])

    # ── orders ────────────────────────────────────────────────────────────────
    op.create_table(
        "orders",
        sa.Column("id",          _col_id,   primary_key=True),
        sa.Column("buyer_id",    sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("gig_id",      sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("gigs.id"),  nullable=False),
        sa.Column("package_id",  sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("gig_packages.id"), nullable=True),
        sa.Column("price",       sa.Numeric(10, 2), nullable=False),
        sa.Column("anchor_text", sa.String,  nullable=True),
        sa.Column("target_url",  sa.String,  nullable=True),
        sa.Column("status",      sa.String(20), server_default="PENDING"),
        sa.Column("proof_url",   sa.String,  nullable=True),
        sa.Column("verification_status", sa.String(20), server_default="PENDING"),
        sa.Column("ai_verification_report", sa.Text, nullable=True),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at",  sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_orders_buyer",  "orders", ["buyer_id", "status"])
    op.create_index("idx_orders_gig",    "orders", ["gig_id"])

    # ── payments ──────────────────────────────────────────────────────────────
    op.create_table(
        "payments",
        sa.Column("id",                  _col_id,   primary_key=True),
        sa.Column("order_id",            sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("orders.id"), nullable=False, unique=True),
        sa.Column("razorpay_order_id",   sa.String(100), nullable=True, unique=True),
        sa.Column("razorpay_payment_id", sa.String(100), nullable=True),
        sa.Column("amount",              sa.Numeric(10, 2), nullable=False),
        sa.Column("platform_fee",        sa.Numeric(10, 2), nullable=True),
        sa.Column("seller_earning",      sa.Numeric(10, 2), nullable=True),
        sa.Column("status",              sa.String(20), server_default="PENDING"),
        sa.Column("created_at",          sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── reviews ───────────────────────────────────────────────────────────────
    op.create_table(
        "reviews",
        sa.Column("id",          _col_id,   primary_key=True),
        sa.Column("order_id",    sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("gig_id",      sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("gigs.id",   ondelete="CASCADE"), nullable=False),
        sa.Column("reviewer_id", sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("seller_id",   sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("rating",      sa.Integer, nullable=False),
        sa.Column("comment",     sa.Text,    nullable=True),
        sa.Column("seller_reply", sa.Text,   nullable=True),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_reviews_gig",    "reviews", ["gig_id"])
    op.create_index("idx_reviews_seller", "reviews", ["seller_id"])

    # ── seller_profiles ───────────────────────────────────────────────────────
    op.create_table(
        "seller_profiles",
        sa.Column("id",               _col_id,   primary_key=True),
        sa.Column("user_id",          sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("display_name",     sa.String(100), nullable=False),
        sa.Column("bio",              sa.Text,   nullable=True),
        sa.Column("skills",           sa.Text,   nullable=True),    # JSON array
        sa.Column("languages",        sa.Text,   nullable=True),    # JSON array
        sa.Column("country",          sa.String(100), nullable=True),
        sa.Column("seller_level",     sa.String(20), server_default="new"),
        sa.Column("response_time",    sa.Integer, nullable=True),
        sa.Column("total_earnings",   sa.Numeric(12, 2), server_default="0"),
        sa.Column("completed_orders", sa.Integer, server_default="0"),
        sa.Column("is_available",     sa.Boolean, server_default="1"),
        sa.Column("kyc_status",       sa.String(20), server_default="unverified"),
        sa.Column("kyc_document_url", sa.Text,   nullable=True),
        sa.Column("kyc_rejected_reason", sa.Text, nullable=True),
        sa.Column("kyc_submitted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at",       sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── buyer_profiles ────────────────────────────────────────────────────────
    op.create_table(
        "buyer_profiles",
        sa.Column("id",          _col_id,   primary_key=True),
        sa.Column("user_id",     sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("country",     sa.String(100), nullable=True),
        sa.Column("total_spent", sa.Numeric(12, 2), server_default="0"),
        sa.Column("created_at",  sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── oauth_accounts ────────────────────────────────────────────────────────
    op.create_table(
        "oauth_accounts",
        sa.Column("id",          _col_id,   primary_key=True),
        sa.Column("user_id",     sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider",    sa.String(20),  nullable=False),
        sa.Column("provider_id", sa.String(255), nullable=False),
    )
    op.create_index("idx_oauth_provider", "oauth_accounts", ["provider", "provider_id"], unique=True)

    # ── messages ──────────────────────────────────────────────────────────────
    op.create_table(
        "messages",
        sa.Column("id",        _col_id,   primary_key=True),
        sa.Column("order_id",  sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("sender_id", sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body",      sa.Text,    nullable=False),
        sa.Column("is_read",   sa.Boolean, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("idx_messages_order", "messages", ["order_id", "created_at"])

    # ── disputes ──────────────────────────────────────────────────────────────
    op.create_table(
        "disputes",
        sa.Column("id",             _col_id,   primary_key=True),
        sa.Column("order_id",       sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("opened_by_id",   sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=False),
        sa.Column("reason",         sa.Text,    nullable=False),
        sa.Column("evidence_url",   sa.Text,    nullable=True),
        sa.Column("status",         sa.String(20), server_default="open"),
        sa.Column("admin_notes",    sa.Text,    nullable=True),
        sa.Column("resolved_by_id", sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at",     sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("resolved_at",    sa.DateTime(timezone=True), nullable=True),
    )

    # ── gig_stats ─────────────────────────────────────────────────────────────
    op.create_table(
        "gig_stats",
        sa.Column("id",                _col_id,  primary_key=True),
        sa.Column("gig_id",            sa.String(36) if is_sqlite else UUID(as_uuid=True),
                  sa.ForeignKey("gigs.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("views_count",       sa.Integer, server_default="0"),
        sa.Column("clicks_count",      sa.Integer, server_default="0"),
        sa.Column("impressions_count", sa.Integer, server_default="0"),
        sa.Column("orders_count",      sa.Integer, server_default="0"),
        sa.Column("updated_at",        sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ── weight_policy ─────────────────────────────────────────────────────────
    op.create_table(
        "weight_policy",
        sa.Column("weight_name", sa.String(30), primary_key=True),
        sa.Column("weight_pct",  sa.Numeric(5, 2), nullable=False),
        sa.Column("min_pct",     sa.Numeric(5, 2), nullable=True),
        sa.Column("max_pct",     sa.Numeric(5, 2), nullable=True),
        sa.Column("updated_at",  sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_by",  sa.String(50), nullable=True),
    )


def downgrade() -> None:
    for table in [
        "weight_policy", "gig_stats", "disputes", "messages",
        "oauth_accounts", "buyer_profiles", "seller_profiles",
        "reviews", "payments", "orders",
        "gig_media", "gig_requirements", "gig_packages",
        "gigs", "users", "categories",
    ]:
        op.drop_table(table)

    bind = op.get_bind()
    if bind.dialect.name != "sqlite":
        if op.get_context().dialect.name == "postgresql": op.execute("DROP EXTENSION IF EXISTS pgcrypto")
        if op.get_context().dialect.name == "postgresql": op.execute("DROP EXTENSION IF EXISTS unaccent")
        if op.get_context().dialect.name == "postgresql": op.execute("DROP EXTENSION IF EXISTS pg_trgm")
        if op.get_context().dialect.name == "postgresql": op.execute('DROP EXTENSION IF EXISTS "uuid-ossp"')
