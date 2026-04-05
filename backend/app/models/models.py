import uuid
import hashlib
import json
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Numeric, Text, Enum, JSON, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="buyer") # buyer, seller, admin
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    
    # Seller Performance
    completion_rate = Column(Numeric(5, 2), default=100.0)
    on_time_delivery_rate = Column(Numeric(5, 2), default=100.0)
    response_speed_seconds = Column(Integer, default=3600) # Default 1 hour
    
    # Levels
    publisher_level = Column(Integer, default=0) # 0 to 4
    adzy_choice = Column(Boolean, default=False)
    seller_score = Column(Numeric(5, 2), default=0.0)
    last_level_eval = Column(DateTime(timezone=True), nullable=True)
    
    avatar_url = Column(String, nullable=True)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now())
    total_orders_completed = Column(Integer, default=0)
    
    # Industrial Security & Risk
    two_fa_enabled = Column(Boolean, default=False)
    two_fa_secret = Column(String(64), nullable=True)
    ip_whitelist = Column(JSONB, default=list) # List of allowed IPs
    risk_score = Column(Numeric(5, 2), default=0.0)
    trust_score = Column(Numeric(5, 2), default=100.0)
    kyc_verified = Column(Boolean, default=False)
    country = Column(String(3), nullable=True)
    wallet_frozen = Column(Boolean, default=False)
    freeze_reason = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
 
    gigs = relationship("Gig", back_populates="seller", cascade="all, delete-orphan")
    orders_bought = relationship("Order", back_populates="buyer")
    oauth_accounts = relationship("OAuthAccount", back_populates="user", cascade="all, delete-orphan")
    
    seller_profile = relationship("SellerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")
    buyer_profile = relationship("BuyerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Gig(Base):
    __tablename__ = "gigs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title = Column(String(80), nullable=False)
    slug = Column(String(120), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=False)
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    subcategory = Column(String(100))
    tags = Column(JSONB, default=list)
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(String, default="draft") # draft, active, paused, deleted, pending_review, flagged
    
    # Ranking & Intelligence
    rating = Column(Numeric(3, 2), default=5.0)
    reviews_count = Column(Integer, default=0)
    views = Column(Integer, default=0)
    
    # AI Scoring (Gap Port from Blueprint)
    nsfw_score = Column(Numeric(5, 2), default=0.0)
    spam_score = Column(Numeric(5, 2), default=0.0)
    quality_score = Column(Numeric(5, 2), default=0.0)
    
    risk_score = Column(Numeric(5, 2), default=0.0)
    risk_report = Column(Text, nullable=True)
    gig_level = Column(String(20), default="standard")  # standard, hot, recommended, trending
    orders_last_7d = Column(Integer, default=0)
    ctr_7d = Column(Numeric(6, 4), default=0.0)
    conversion_7d = Column(Numeric(6, 4), default=0.0)
    
    # Semantic Search Embedding
    embedding = Column(Vector(1536))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    seller = relationship("User", back_populates="gigs")
    category = relationship("Category", back_populates="gigs")
    packages = relationship("GigPackage", back_populates="gig", cascade="all, delete-orphan")
    requirements = relationship("GigRequirement", back_populates="gig", cascade="all, delete-orphan")
    media = relationship("GigMedia", back_populates="gig", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="gig")
    stats = relationship("GigStats", back_populates="gig", uselist=False, cascade="all, delete-orphan")

class GigStats(Base):
    __tablename__ = "gig_stats"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gig_id = Column(UUID(as_uuid=True), ForeignKey("gigs.id", ondelete="CASCADE"), unique=True)
    views_count = Column(Integer, default=0)
    clicks_count = Column(Integer, default=0)
    impressions_count = Column(Integer, default=0)
    orders_count = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    gig = relationship("Gig", back_populates="stats")

class GigPackage(Base):
    __tablename__ = "gig_packages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gig_id = Column(UUID(as_uuid=True), ForeignKey("gigs.id"), nullable=False)
    tier = Column(String(10), nullable=False) # basic, standard, premium
    name = Column(String(80), nullable=False)
    description = Column(Text, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    delivery_days = Column(Integer, nullable=False)
    revisions = Column(Integer, default=1)
    features = Column(JSONB, default=list)

    gig = relationship("Gig", back_populates="packages")

class GigRequirement(Base):
    __tablename__ = "gig_requirements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gig_id = Column(UUID(as_uuid=True), ForeignKey("gigs.id"), nullable=False)
    question = Column(Text, nullable=False)
    input_type = Column(String(20), default="text") # text, textarea, file, multiple_choice
    choices = Column(JSONB, default=list)
    is_required = Column(Boolean, default=True)
    sort_order = Column(Integer, default=0)

    gig = relationship("Gig", back_populates="requirements")

class GigMedia(Base):
    __tablename__ = "gig_media"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gig_id = Column(UUID(as_uuid=True), ForeignKey("gigs.id"), nullable=False)
    media_type = Column(String(10), nullable=False)   # image | video
    raw_key = Column(Text, nullable=False)             # original S3 key
    processed_key = Column(Text, nullable=True)        # processed S3 key (set after Celery)
    url = Column(Text, nullable=False)                 # public CDN URL (cover size)
    processed_urls = Column(JSONB, default=dict)         # {cover, thumbnail, small, video_url, ...}
    status = Column(String(20), default="processing")  # processing | ready | error
    sort_order = Column(Integer, default=0)
    is_cover = Column(Boolean, default=False)

    gig = relationship("Gig", back_populates="media")

class Category(Base):
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    parent_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"), nullable=True)
    icon = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)
    sort_order = Column(Integer, default=0)
    level = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    gig_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    children = relationship("Category")
    gigs = relationship("Gig", back_populates="category")

class Order(Base):
    __tablename__ = "orders"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    gig_id = Column(UUID(as_uuid=True), ForeignKey("gigs.id"))
    package_id = Column(UUID(as_uuid=True), ForeignKey("gig_packages.id"), nullable=True)
    price = Column(Numeric(10, 2), nullable=False)
    anchor_text = Column(String)
    target_url = Column(String)
    status = Column(String, default="PENDING") # PENDING, PAID, IN_PROGRESS, COMPLETED, CANCELLED, DISPUTED
    proof_url = Column(String, nullable=True)
    verification_status = Column(String, default="PENDING") # PENDING, VERIFIED, FAILED
    ai_verification_report = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())

    buyer = relationship("User", back_populates="orders_bought")
    gig = relationship("Gig", back_populates="orders")
    package = relationship("GigPackage")
    payment = relationship("Payment", back_populates="order", uselist=False)

class Payment(Base):
    __tablename__ = "payments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id"), unique=True)
    razorpay_order_id = Column(String, unique=True, index=True, nullable=True)
    razorpay_payment_id = Column(String, nullable=True)
    amount = Column(Numeric(10, 2))
    platform_fee = Column(Numeric(10, 2), nullable=True)
    seller_earning = Column(Numeric(10, 2), nullable=True)
    status = Column(String, default="PENDING") # PENDING, CAPTURED, FAILED, REFUNDED
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="payment")

class SellerProfile(Base):
    __tablename__ = "seller_profiles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    display_name = Column(String(100), nullable=False)
    bio = Column(Text)
    skills = Column(JSONB, default=list)
    languages = Column(JSONB, default=list)
    country = Column(String(100))
    seller_level = Column(String(20), default="new")
    response_time = Column(Integer)
    total_earnings = Column(Numeric(12, 2), default=0)
    completed_orders = Column(Integer, default=0)
    is_available = Column(Boolean, default=True)
    # KYC
    kyc_status = Column(String(20), default="unverified") # unverified, pending, verified, rejected
    kyc_document_url = Column(Text, nullable=True)
    kyc_rejected_reason = Column(Text, nullable=True)
    kyc_submitted_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="seller_profile")
 
class BuyerProfile(Base):
    __tablename__ = "buyer_profiles"
 
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    country = Column(String(100))
    total_spent = Column(Numeric(12, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
 
    user = relationship("User", back_populates="buyer_profile")

class OAuthAccount(Base):
    __tablename__ = "oauth_accounts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    provider = Column(String, nullable=False)
    provider_id = Column(String, nullable=False)

    user = relationship("User", back_populates="oauth_accounts")


class WeightPolicy(Base):
    __tablename__ = "weight_policy"

    weight_name = Column(String(30), primary_key=True)
    weight_pct = Column(Numeric(5, 2), nullable=False)
    min_pct = Column(Numeric(5, 2), nullable=True)
    max_pct = Column(Numeric(5, 2), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    updated_by = Column(String(50), nullable=True)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    gig_id = Column(UUID(as_uuid=True), ForeignKey("gigs.id", ondelete="CASCADE"))
    reviewer_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))   # buyer
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))     # seller
    rating = Column(Integer, nullable=False)        # 1–5
    comment = Column(Text, nullable=True)
    seller_reply = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order")
    gig = relationship("Gig")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
    seller = relationship("User", foreign_keys=[seller_id])


class Message(Base):
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"))
    sender_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order")
    sender = relationship("User")


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.id", ondelete="CASCADE"), unique=True)
    opened_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    reason = Column(Text, nullable=False)
    evidence_url = Column(Text, nullable=True)
    status = Column(String(20), default="open")  # open, in_review, escalated, resolved, closed
    admin_notes = Column(Text, nullable=True)
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    # SLA & Sentiment
    sla_deadline = Column(DateTime(timezone=True), nullable=True)
    sentiment = Column(Numeric(3, 2), default=0.0) # -1.0 to 1.0 (Ported from SupportTicket logic)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    order = relationship("Order")
    opened_by = relationship("User", foreign_keys=[opened_by_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])

class SiteConfig(Base):
    """
    Key-value store for every configurable platform setting.
    Changes here reflect on the live site within seconds.
    """
    __tablename__ = "site_config"

    key         = Column(String(100), primary_key=True)
    value       = Column(JSONB,       nullable=False)   # any type
    value_type  = Column(String(20),  nullable=False)   # string|number|bool|json
    category    = Column(String(50),  nullable=False)   # fees|features|content|limits
    label       = Column(String(100), nullable=False)   # human-readable
    description = Column(Text,        nullable=True)
    is_public   = Column(Boolean,     default=False)    # expose to frontend?
    updated_by  = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

class FeatureFlag(Base):
    """Toggle any feature on/off per user segment."""
    __tablename__ = "feature_flags"

    key           = Column(String(100), primary_key=True)
    label         = Column(String(100), nullable=False)
    is_enabled    = Column(Boolean,     nullable=False, default=False)
    rollout_pct   = Column(Integer,     default=100)     # 0-100% of users
    allowed_roles = Column(JSONB, default=[])    # [] = all roles
    allowed_envs  = Column(JSONB, default=["production", "staging"])
    metadata_col  = Column(JSONB, default={})            # extra conditions (Cannot use 'metadata' name natively in declarative base)

class AuditLog(Base):
    """Every admin action recorded forever."""
    __tablename__ = "admin_audit_log"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    action      = Column(String(100), nullable=False)   # user.ban, config.update etc
    target_type = Column(String(50),  nullable=True)    # user|gig|order|config
    target_id   = Column(String(100), nullable=True)
    old_value   = Column(JSONB, nullable=True)
    new_value   = Column(JSONB, nullable=True)
    ip_address  = Column(String(45),  nullable=True)
    user_agent  = Column(Text,        nullable=True)
    payload     = Column(JSONB,        nullable=True) # Full action payload
    chain_hash  = Column(String(64),  nullable=True) # For tamper-evident logs
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

# ─────────────────────────────────────────
# AUDIT LOG CHAIN HASHING (SQLAlchemy Event)
# ─────────────────────────────────────────
from sqlalchemy import event, select

@event.listens_for(AuditLog, 'before_insert')
def hash_audit_log(mapper, connection, target):
    """
    Implements a blockchain-style chain hash for audit logs.
    Ensures that any modification or deletion of past logs can be detected.
    """
    # 1. Get the latest log's hash
    last_log = connection.execute(
        select(AuditLog.chain_hash).order_by(AuditLog.created_at.desc(), AuditLog.id.desc()).limit(1)
    ).scalar_one_or_none()
    
    prev_hash = last_log if last_log else "0" * 64
    
    # 2. Prepare data for hashing
    # Format: prev_hash | admin_id | action | target_id | payload_json
    # We use json.dumps with sort_keys=True to ensure deterministic hashing
    import json
    payload_str = json.dumps(target.payload, sort_keys=True) if target.payload else "{}"
    data_str = f"{prev_hash}|{str(target.admin_id)}|{target.action}|{str(target.target_id)}|{payload_str}"
    
    # 3. Calculate SHA256
    target.chain_hash = hashlib.sha256(data_str.encode()).hexdigest()

class AutomationRule(Base):
    __tablename__ = "automation_rules"
    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(100))
    trigger     = Column(JSONB)    
    action      = Column(JSONB)    
    is_active   = Column(Boolean, default=True)
    run_count   = Column(Integer,  default=0)
    last_run_at = Column(DateTime, nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

class HomepageSection(Base):
    __tablename__ = "homepage_sections"
    id          = Column(String(50), primary_key=True)
    is_visible  = Column(Boolean, default=True)
    sort_order  = Column(Integer, default=0)
    config      = Column(JSONB, default={})

class Coupon(Base):
    __tablename__ = "coupons"
    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code             = Column(String(50), unique=True, index=True, nullable=False)
    type             = Column(String(20), nullable=False)  # percentage | fixed
    value            = Column(Numeric(10, 2), nullable=False)
    usage_limit      = Column(Integer, nullable=False)
    usage_count      = Column(Integer, default=0)
    expiry_date      = Column(DateTime, nullable=False)
    min_order_amount = Column(Numeric(10, 2), nullable=True)
    applies_to       = Column(String(50), default="all")
    is_active        = Column(Boolean, default=True)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

# ══════════════════════════════════════════════════════════════
# GAP 3: Wallet + WithdrawalRequest — Seller Payout Ledger
# ══════════════════════════════════════════════════════════════

class Wallet(Base):
    """
    Internal balance ledger per user.
    Sellers accumulate earnings here after order completion.
    Buyers can optionally pre-fund to pay without hitting card each time.
    """
    __tablename__ = "wallets"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    balance    = Column(Numeric(12, 2), default=0.00, nullable=False)
    currency   = Column(String(3), default="USD", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user                 = relationship("User", backref="wallet", uselist=False)
    withdrawal_requests  = relationship("WithdrawalRequest", back_populates="wallet", cascade="all, delete-orphan")
    transactions         = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan")


class WithdrawalRequest(Base):
    """Seller initiates; admin processes. Tracks PayPal / bank-transfer payouts."""
    __tablename__ = "withdrawal_requests"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id    = Column(UUID(as_uuid=True), ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    amount       = Column(Numeric(12, 2), nullable=False)
    method       = Column(String(50), nullable=False)             # paypal | bank_transfer | crypto
    details      = Column(JSONB, default={})                       # encrypted account info
    status       = Column(
        String(20), nullable=False, server_default="requested"
    )  # requested | processing | completed | rejected
    admin_notes  = Column(Text, nullable=True)
    requested_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    processed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    wallet       = relationship("Wallet", back_populates="withdrawal_requests")
    processor    = relationship("User", foreign_keys=[processed_by])


class WalletTransaction(Base):
    """Immutable ledger entry — every credit/debit to a wallet."""
    __tablename__ = "wallet_transactions"

    TYPES = ["credit", "debit", "commission", "refund", "withdrawal"]

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    wallet_id        = Column(UUID(as_uuid=True), ForeignKey("wallets.id", ondelete="CASCADE"), nullable=False)
    order_id         = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)
    withdrawal_id    = Column(UUID(as_uuid=True), ForeignKey("withdrawal_requests.id"), nullable=True)
    amount           = Column(Numeric(12, 2), nullable=False)   # positive = credit, negative = debit
    transaction_type = Column(String(20), nullable=False)       # from TYPES
    description      = Column(Text, nullable=False)
    reference_id     = Column(String(255), unique=True, nullable=False)  # idempotency key
    status           = Column(String(20), default="success")    # pending | success | failed | refunded
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    wallet = relationship("Wallet", back_populates="transactions")

# ══════════════════════════════════════════════════════════════
# GAP 1 & 2: StaticPage + SitemapEntry — CMS Layer
# ══════════════════════════════════════════════════════════════

class StaticPage(Base):
    """
    CMS-controlled pages: About Us, Terms of Service, Privacy Policy, FAQ, etc.
    Admin can create/edit without a deployment.
    """
    __tablename__ = "static_pages"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title           = Column(String(200), nullable=False)
    slug            = Column(String(200), unique=True, index=True, nullable=False)
    content         = Column(Text, nullable=False)           # Rich HTML / Markdown
    seo_title       = Column(String(255), nullable=True)
    seo_description = Column(Text, nullable=True)
    meta_keywords   = Column(String(500), nullable=True)
    og_image_url    = Column(Text, nullable=True)
    is_published    = Column(Boolean, default=True, nullable=False)
    published_at    = Column(DateTime(timezone=True), nullable=True)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
    updated_at      = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    created_by      = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)

    author = relationship("User", foreign_keys=[created_by])


class SitemapEntry(Base):
    """
    Manually-managed sitemap records for pages not auto-discovered.
    The /sitemap.xml endpoint merges these with dynamically generated gig/category URLs.
    """
    __tablename__ = "sitemap_entries"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    url        = Column(Text, unique=True, nullable=False)
    changefreq = Column(String(20), default="weekly")    # always|hourly|daily|weekly|monthly|yearly|never
    priority   = Column(Numeric(2, 1), default=0.5)      # 0.0 – 1.0
    lastmod    = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    is_active  = Column(Boolean, default=True)

# ══════════════════════════════════════════════════════════════
# GAP 4: MessageThread — Standalone Pre-Order Chat
# ══════════════════════════════════════════════════════════════

class MessageThread(Base):
    """
    A conversation thread between a buyer and a seller.
    Can be linked to an order (post-order comms) OR standalone (pre-order inquiry).
    The existing Message model is order-scoped; this is the general inbox model.
    """
    __tablename__ = "message_threads"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    buyer_id     = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    seller_id    = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    order_id     = Column(UUID(as_uuid=True), ForeignKey("orders.id"), nullable=True)     # NULL = pre-order inquiry
    gig_id       = Column(UUID(as_uuid=True), ForeignKey("gigs.id"), nullable=True)        # the gig being inquired about
    subject      = Column(String(200), nullable=True)
    last_message = Column(Text, nullable=True)                                             # denormalized for inbox display
    last_msg_at  = Column(DateTime(timezone=True), nullable=True)
    buyer_unread = Column(Integer, default=0)
    seller_unread = Column(Integer, default=0)
    is_archived  = Column(Boolean, default=False)
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    buyer   = relationship("User", foreign_keys=[buyer_id])
    seller  = relationship("User", foreign_keys=[seller_id])
    order   = relationship("Order", foreign_keys=[order_id])
    gig     = relationship("Gig", foreign_keys=[gig_id])
    inbox_messages = relationship("InboxMessage", back_populates="thread", cascade="all, delete-orphan", order_by="InboxMessage.created_at")


class InboxMessage(Base):
    """Individual message inside a MessageThread."""
    __tablename__ = "inbox_messages"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    thread_id   = Column(UUID(as_uuid=True), ForeignKey("message_threads.id", ondelete="CASCADE"), nullable=False)
    sender_id   = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    body        = Column(Text, nullable=False)
    attachment_url = Column(Text, nullable=True)
    is_read     = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())

    thread = relationship("MessageThread", back_populates="inbox_messages")
    sender = relationship("User", foreign_keys=[sender_id])


# ══════════════════════════════════════════════════════════════
# INDUSTRIAL UPGRADE: NEW MODELS
# ══════════════════════════════════════════════════════════════

class FraudAlert(Base):
    """Tracks suspicious activity (AML, Bot, Travel, etc.)"""
    __tablename__ = "fraud_alerts"

    id         = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id    = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    alert_type = Column(String(50), nullable=False) # aml, bot, impossible_travel, chargeback
    severity   = Column(Integer, default=1)         # 1-5
    details    = Column(JSONB, default={})
    resolved   = Column(Boolean, default=False)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])


class IPReputation(Base):
    """Tracks risky IP addresses (VPN, Tor, Proxy)."""
    __tablename__ = "ip_reputation"

    ip_address = Column(String(45), primary_key=True)
    is_vpn     = Column(Boolean, default=False)
    is_tor     = Column(Boolean, default=False)
    is_proxy   = Column(Boolean, default=False)
    is_blocked = Column(Boolean, default=False)
    risk_score = Column(Numeric(5, 2), default=0.0)
    country    = Column(String(3), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ComplianceRecord(Base):
    """GDPR, KYC, AML screening and identity verification logs."""
    __tablename__ = "compliance_records"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    record_type = Column(String(50), nullable=False) # kyc, gdpr, aml
    status      = Column(String(30), default="pending")
    data        = Column(JSONB, default={})
    handled_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    deadline    = Column(DateTime(timezone=True), nullable=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id])


class CommissionRule(Base):
    """Dynamic platform fees based on category, tier or merchant history."""
    __tablename__ = "commission_rules"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name        = Column(String(100), nullable=False)
    category    = Column(String(100), nullable=True)  # NULL = all categories
    seller_tier = Column(String(50),  nullable=True)  # NULL = all tiers
    rate        = Column(Numeric(5, 2), nullable=False) # e.g. 10.00%
    min_amount  = Column(Numeric(10, 2), default=0)
    is_active   = Column(Boolean, default=True)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())


class Refund(Base):
    """Auditable refund records linked to payment transactions."""
    __tablename__ = "refunds"

    id             = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    payment_id     = Column(UUID(as_uuid=True), ForeignKey("payments.id"), nullable=False)
    amount         = Column(Numeric(12, 2), nullable=False)
    reason         = Column(String(50), nullable=False)
    notes          = Column(Text, nullable=True)
    approved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at     = Column(DateTime(timezone=True), server_default=func.now())

    payment = relationship("Payment")


class SupportTicket(Base):
    """User support requests with priority and sentiment analysis."""
    __tablename__ = "support_tickets"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id     = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject     = Column(String(255), nullable=False)
    body        = Column(Text, nullable=False)
    priority    = Column(String(10), default="medium") # low, medium, high, urgent
    status      = Column(String(20), default="open")   # open, pending, resolved
    assigned_to_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    sentiment   = Column(Numeric(3, 2), default=0.0)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", foreign_keys=[user_id])


class SystemAlert(Base):
    """Technical platform alerts (Disk, CPU, Latency, Error Spike)."""
    __tablename__ = "system_alerts"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title       = Column(String(255), nullable=False)
    message     = Column(Text, nullable=False)
    severity    = Column(String(10), nullable=False) # info, warning, critical
    source      = Column(String(100), nullable=False) # e.g. 'worker-1', 'db-primary'
    is_resolved = Column(Boolean, default=False)
    created_at  = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

