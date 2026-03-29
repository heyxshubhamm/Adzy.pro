import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Numeric, Text, Enum, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
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
    last_level_eval = Column(DateTime(timezone=True), nullable=True)
    
    avatar_url = Column(String, nullable=True)
    last_active_at = Column(DateTime(timezone=True), server_default=func.now())
    total_orders_completed = Column(Integer, default=0)
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
    tags = Column(ARRAY(String), default=[])
    seller_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    status = Column(String, default="draft") # draft, active, paused, deleted
    
    # Ranking & Intelligence
    rating = Column(Numeric(3, 2), default=5.0)
    reviews_count = Column(Integer, default=0)
    views = Column(Integer, default=0)
    risk_score = Column(Numeric(5, 2), default=0.0)
    risk_report = Column(Text, nullable=True)
    
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
    features = Column(ARRAY(String), default=[])

    gig = relationship("Gig", back_populates="packages")

class GigRequirement(Base):
    __tablename__ = "gig_requirements"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    gig_id = Column(UUID(as_uuid=True), ForeignKey("gigs.id"), nullable=False)
    question = Column(Text, nullable=False)
    input_type = Column(String(20), default="text") # text, textarea, file, multiple_choice
    choices = Column(ARRAY(String))
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
    processed_urls = Column(JSONB, default={})         # {cover, thumbnail, small, video_url, ...}
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
    skills = Column(ARRAY(String))
    languages = Column(ARRAY(String))
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
    status = Column(String(20), default="open")  # open, resolved_buyer, resolved_seller, cancelled
    admin_notes = Column(Text, nullable=True)
    resolved_by_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    order = relationship("Order")
    opened_by = relationship("User", foreign_keys=[opened_by_id])
    resolved_by = relationship("User", foreign_keys=[resolved_by_id])
