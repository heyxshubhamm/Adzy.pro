from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Order, Gig, Review

router = APIRouter(tags=["reviews"])


# ── Schemas ──────────────────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = Field(None, max_length=1000)


class SellerReplyIn(BaseModel):
    reply: str = Field(..., max_length=500)


class ReviewOut(BaseModel):
    id: UUID
    order_id: UUID
    gig_id: UUID
    rating: int
    comment: Optional[str] = None
    seller_reply: Optional[str] = None
    created_at: datetime
    reviewer: Optional[dict] = None

    class Config:
        from_attributes = True


# ── Helpers ──────────────────────────────────────────────────────────────────

def _format_review(review: Review) -> dict:
    return {
        "id": str(review.id),
        "order_id": str(review.order_id),
        "gig_id": str(review.gig_id),
        "rating": review.rating,
        "comment": review.comment,
        "seller_reply": review.seller_reply,
        "created_at": review.created_at.isoformat(),
        "reviewer": {
            "username": review.reviewer.username,
            "avatar_url": review.reviewer.avatar_url,
        } if review.reviewer else None,
    }


# ── Routes ───────────────────────────────────────────────────────────────────

@router.post("/orders/{order_id}/review", response_model=dict, status_code=201)
async def create_review(
    order_id: str,
    body: ReviewCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Buyer submits a review after order is COMPLETED."""
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(selectinload(Order.gig))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.buyer_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Only the buyer can review this order")
    if order.status != "COMPLETED":
        raise HTTPException(status_code=400, detail="Can only review completed orders")

    # One review per order
    existing = await db.execute(select(Review).where(Review.order_id == order.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Review already submitted for this order")

    review = Review(
        order_id=order.id,
        gig_id=order.gig_id,
        reviewer_id=user.id,
        seller_id=order.gig.seller_id,
        rating=body.rating,
        comment=body.comment,
    )
    db.add(review)

    # Recompute gig average rating
    await db.flush()
    avg_result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(Review.gig_id == order.gig_id)
    )
    avg_rating, count = avg_result.one()
    if order.gig:
        order.gig.rating = round(float(avg_rating), 2)
        order.gig.reviews_count = count

    await db.commit()
    return {"message": "Review submitted", "id": str(review.id)}


@router.get("/gigs/{gig_id}/reviews", response_model=List[dict])
async def get_gig_reviews(
    gig_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Review)
        .where(Review.gig_id == gig_id)
        .options(selectinload(Review.reviewer))
        .order_by(Review.created_at.desc())
    )
    reviews = result.scalars().all()
    return [_format_review(r) for r in reviews]


@router.post("/reviews/{review_id}/reply", response_model=dict)
async def seller_reply(
    review_id: str,
    body: SellerReplyIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Seller can reply once to a review on their gig."""
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")
    if str(review.seller_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not your review to reply to")
    if review.seller_reply:
        raise HTTPException(status_code=409, detail="Already replied to this review")

    review.seller_reply = body.reply
    await db.commit()
    return {"message": "Reply added"}
