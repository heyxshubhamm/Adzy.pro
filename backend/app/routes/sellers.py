"""
Public seller profile endpoint.
GET /sellers/{username}  — returns profile, level, gig stats
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import User, Gig, Review, SellerProfile

router = APIRouter(tags=["sellers"])

LEVEL_LABELS = {0: "New Seller", 1: "Level 1", 2: "Level 2", 3: "Top Rated", 4: "adzy.pro Choice"}
LEVEL_COLORS = {0: "#6b7280", 1: "#3b82f6", 2: "#8b5cf6", 3: "#f59e0b", 4: "#00f0ff"}


@router.get("/{username}", response_model=dict)
async def get_seller_profile(
    username: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(User)
        .where(User.username == username, User.role == "seller")
        .options(selectinload(User.seller_profile), selectinload(User.gigs))
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Seller not found")

    level = user.publisher_level or 0

    # Active gigs count
    active_gigs = [g for g in user.gigs if g.status == "active"]

    # Average rating across gigs
    avg_result = await db.execute(
        select(func.avg(Review.rating), func.count(Review.id))
        .where(Review.seller_id == user.id)
    )
    avg_rating, total_reviews = avg_result.one()

    profile = user.seller_profile

    return {
        "id": str(user.id),
        "username": user.username,
        "avatar_url": user.avatar_url,
        "member_since": user.created_at.isoformat(),
        "publisher_level": level,
        "level_label": LEVEL_LABELS.get(level, "New Seller"),
        "level_color": LEVEL_COLORS.get(level, "#6b7280"),
        "total_orders_completed": user.total_orders_completed or 0,
        "completion_rate": float(user.completion_rate or 100),
        "on_time_delivery_rate": float(user.on_time_delivery_rate or 100),
        "avg_rating": round(float(avg_rating), 2) if avg_rating else None,
        "total_reviews": total_reviews or 0,
        "active_gigs": len(active_gigs),
        "profile": {
            "display_name": profile.display_name if profile else None,
            "bio": profile.bio if profile else None,
            "skills": profile.skills if profile else [],
            "languages": profile.languages if profile else [],
            "country": profile.country if profile else None,
            "is_available": profile.is_available if profile else True,
            "kyc_verified": profile.kyc_status == "verified" if profile else False,
        } if profile else None,
    }
