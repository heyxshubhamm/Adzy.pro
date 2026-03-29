from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import Optional, List

# Auth
class UserBase(BaseModel):
    username: str
    email: EmailStr

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    role: str
    is_verified: bool
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
 
    class Config:
        from_attributes = True

class SellerOnboardingIn(BaseModel):
    display_name: str = Field(..., min_length=2, max_length=100)
    bio: str = Field(..., min_length=20, max_length=1000)
    skills: List[str] = Field(..., min_items=1, max_items=15)
    languages: List[str] = Field(..., min_items=1)
    country: str
    response_time: int = Field(..., ge=1, le=72) # hours

class SellerProfileOut(BaseModel):
    display_name: str
    bio: Optional[str]
    skills: Optional[List[str]]
    languages: Optional[List[str]]
    seller_level: str
    completed_orders: int
    is_available: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

# Gigs (legacy — listings.py only; new code uses schemas/gigs.py)
class CategoryCreate(BaseModel):
    name: str
    slug: str
    parent_id: Optional[UUID] = None

class CategoryResponse(BaseModel):
    id: UUID
    name: str
    slug: str
    parent_id: Optional[UUID] = None

    class Config:
        from_attributes = True

# Orders
class GigBrief(BaseModel):
    id: UUID
    title: str
    slug: str
    tags: Optional[List[str]] = None

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    gig_id: UUID
    package_id: Optional[UUID] = None
    anchor_text: str
    target_url: str

class OrderResponse(BaseModel):
    id: UUID
    gig_id: UUID
    package_id: Optional[UUID] = None
    anchor_text: str
    target_url: str
    price: float
    status: str
    proof_url: Optional[str] = None
    verification_status: str = "PENDING"
    ai_verification_report: Optional[str] = None
    created_at: datetime
    buyer_id: UUID
    gig: Optional[GigBrief] = None

    class Config:
        from_attributes = True

# Payments
class PaymentCreate(BaseModel):
    order_id: UUID

class PaymentResponse(BaseModel):
    id: UUID
    amount: float
    status: str
    created_at: datetime

    class Config:
        from_attributes = True
