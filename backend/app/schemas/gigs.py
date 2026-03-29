from pydantic import BaseModel, Field, field_validator, computed_field
from typing import List, Optional
from decimal import Decimal
from uuid import UUID
from datetime import datetime
import re

# --- Packages ---
class PackageIn(BaseModel):
    tier: str = Field(..., pattern="^(basic|standard|premium)$")
    name: str = Field(..., min_length=3, max_length=80)
    description: str = Field(..., min_length=10)
    price: Decimal = Field(..., gt=0, le=10000)
    delivery_days: int = Field(..., ge=1, le=365)
    revisions: int = Field(1, ge=-1, le=100) # -1 = unlimited
    features: List[str] = Field(default=[])

class PackageOut(PackageIn):
    id: UUID
    class Config:
        from_attributes = True

# --- Requirements ---
class RequirementIn(BaseModel):
    question: str = Field(..., min_length=5)
    input_type: str = Field("text", pattern="^(text|textarea|file|multiple_choice)$")
    choices: Optional[List[str]] = None
    is_required: bool = True
    sort_order: int = 0

class RequirementOut(RequirementIn):
    id: UUID
    class Config:
        from_attributes = True

# --- Media ---
class MediaOut(BaseModel):
    id: UUID
    media_type: str
    url: str
    sort_order: int
    is_cover: bool
    status: str = "ready"
    processed_urls: Optional[dict] = None
    class Config:
        from_attributes = True

# --- Gig ---
class GigCreateIn(BaseModel):
    title: str = Field(..., min_length=15, max_length=80)
    description: str = Field(..., min_length=120)
    category_id: UUID
    subcategory: Optional[str] = None
    tags: List[str] = Field(..., min_items=1, max_items=5)
    packages: List[PackageIn]
    requirements: List[RequirementIn] = []

    @field_validator("tags")
    @classmethod
    def tags_lowercase(cls, v):
        return [t.lower().strip() for t in v]

    @field_validator("packages")
    @classmethod
    def must_have_basic(cls, v):
        tiers = {p.tier for p in v}
        if "basic" not in tiers:
            raise ValueError("At least a basic package is required")
        return v

class GigUpdateIn(BaseModel):
    title: Optional[str] = Field(None, min_length=15, max_length=80)
    description: Optional[str] = Field(None, min_length=120)
    category_id: Optional[UUID] = None
    subcategory: Optional[str] = None
    tags: Optional[List[str]] = None
    packages: Optional[List[PackageIn]] = None
    requirements: Optional[List[RequirementIn]] = None

class SellerBrief(BaseModel):
    id: UUID
    username: str
    avatar_url: Optional[str] = None
    publisher_level: int = 0
    class Config:
        from_attributes = True

class GigOut(BaseModel):
    id: UUID
    title: str
    slug: str
    description: str
    tags: List[str]
    status: str
    rating: Optional[Decimal] = None
    reviews_count: int = 0
    category_id: Optional[UUID] = None
    subcategory: Optional[str] = None
    packages: List[PackageOut]
    requirements: List[RequirementOut]
    media: List[MediaOut]
    seller: Optional[SellerBrief] = None

    @computed_field
    @property
    def min_price(self) -> Optional[Decimal]:
        if not self.packages:
            return None
        return min(p.price for p in self.packages)

    class Config:
        from_attributes = True

# --- Detail-page schemas ---

class SellerPublicOut(BaseModel):
    id: UUID
    username: str
    avatar_url: Optional[str] = None
    display_name: Optional[str] = None
    bio: Optional[str] = None
    seller_level: Optional[str] = "new"
    member_since: datetime
    completed_orders: int = 0
    avg_rating: Optional[float] = None
    review_count: int = 0
    response_time: Optional[int] = None
    languages: Optional[List[str]] = None
    country: Optional[str] = None
    is_available: bool = True

    class Config:
        from_attributes = True


class ReviewDetailOut(BaseModel):
    id: UUID
    buyer_name: str
    buyer_avatar: Optional[str] = None
    rating: int
    comment: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class RelatedGigOut(BaseModel):
    id: UUID
    title: str
    slug: str
    cover_url: Optional[str] = None
    price_from: Decimal
    avg_rating: Optional[float] = None
    review_count: int = 0

    class Config:
        from_attributes = True


class GigDetailOut(BaseModel):
    id: UUID
    title: str
    slug: str
    description: str
    tags: List[str]
    status: str
    views: int = 0
    review_count: int = 0
    avg_rating: Optional[float] = None
    created_at: datetime

    seller: SellerPublicOut
    packages: List[PackageOut]
    requirements: List[dict]
    media: List[dict]
    reviews: List[ReviewDetailOut]
    related_gigs: List[RelatedGigOut]

    class Config:
        from_attributes = True


# --- S3 presigned URL ---
class PresignedURLRequest(BaseModel):
    filename: str
    media_type: str = Field(..., pattern="^(image|video)$")
    content_type: str  # e.g. "image/jpeg"
    file_size: int     # bytes — enforced via ContentLength in presigned URL

class PresignedURLOut(BaseModel):
    upload_url: str     # PUT to this URL directly from the browser
    raw_key: str        # original S3 key — pass back on confirm
    processed_key: str  # where Celery will write the processed file
    public_url: str     # final CDN URL (cover size after processing)
