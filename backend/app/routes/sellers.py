"""
Public seller profile endpoint.
GET /sellers/{username}  — returns profile, level, gig stats
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.models.models import User, Gig, Review, SellerProfile

router = APIRouter(tags=["sellers"])

LEVEL_LABELS = {0: "New Seller", 1: "Level 1", 2: "Level 2", 3: "Best Seller", 4: "Adzy Choice"}
LEVEL_COLORS = {0: "#6b7280", 1: "#3b82f6", 2: "#8b5cf6", 3: "#f59e0b", 4: "#00f0ff"}


@router.get("/recommendations/top", response_model=list[dict])
async def get_top_sellers(
    category_id: str | None = Query(default=None),
    limit: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(User)
        .where(User.role == "seller")
        .options(selectinload(User.seller_profile), selectinload(User.gigs))
    )
    result = await db.execute(query)
    sellers = result.scalars().all()

    ranked = []
    for seller in sellers:
        active_gigs = [g for g in seller.gigs if g.status == "active"]
        if category_id:
            active_gigs = [g for g in active_gigs if str(g.category_id) == category_id]
        if not active_gigs:
            continue

        avg_rating = sum(float(g.rating or 0.0) for g in active_gigs) / max(len(active_gigs), 1)
        reviews_count = sum(int(g.reviews_count or 0) for g in active_gigs)
        level = int(seller.publisher_level or 0)
        if seller.adzy_choice:
            level = 4

        response_score = max(0.0, 1.0 - ((float(seller.response_speed_seconds or 3600) / 3600.0) / 24.0))
        completion_score = float(seller.completion_rate or 0.0) / 100.0
        score = (
            (avg_rating / 5.0) * 0.40
            + min(1.0, reviews_count / 200.0) * 0.20
            + (level / 4.0) * 0.20
            + response_score * 0.10
            + completion_score * 0.10
        )

        ranked.append(
            {
                "id": str(seller.id),
                "username": seller.username,
                "avatar_url": seller.avatar_url,
                "publisher_level": level,
                "adzy_choice": bool(seller.adzy_choice),
                "level_label": LEVEL_LABELS.get(level, "New Seller"),
                "avg_rating": round(avg_rating, 2),
                "reviews_count": reviews_count,
                "active_gigs": len(active_gigs),
                "score": round(score, 5),
            }
        )

    ranked.sort(key=lambda x: x["score"], reverse=True)
    return ranked[:limit]


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
    if user.adzy_choice:
        level = 4

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
        "adzy_choice": bool(user.adzy_choice),
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
