from fastapi import APIRouter, Depends
from app.services.claude_service import claude_service
from app.models.models import Gig, GigStats
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.services.ranking import calculate_final_score
from sqlalchemy import func, select, or_
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone
import uuid
from app.db.session import get_db

router = APIRouter()


async def enrich_listing_metadata(listing_id: uuid.UUID, db_factory):
    """Background task: run AI risk analysis and update gig fields."""
    async with db_factory() as db:
        result = await db.execute(select(Gig).where(Gig.id == listing_id))
        listing = result.scalar_one_or_none()
        if not listing:
            return

        try:
            risk_data = await claude_service.analyze_listing_risk(
                listing.title,
                listing.description,
                0,   # dr — not on Gig model; pass 0
                "0", # traffic — not on Gig model; pass "0"
                0.0, # price — resolved from packages at order time
            )
            listing.risk_score = risk_data.get("risk_score", 0)
            listing.risk_report = risk_data.get("report")

            if listing.risk_score > 50:
                listing.status = "draft"
        except Exception:
            pass

        await db.commit()


@router.get("/", response_model=dict)
async def get_listings(
    q: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """Legacy listing endpoint — returns ranked active gigs."""
    query = (
        select(Gig)
        .where(Gig.status == "active")
        .options(
            selectinload(Gig.seller),
            selectinload(Gig.stats),
            selectinload(Gig.packages),
        )
    )

    if q:
        query = query.where(
            or_(
                Gig.title.ilike(f"%{q}%"),
                Gig.description.ilike(f"%{q}%"),
            )
        )

    result = await db.execute(query)
    listings = result.scalars().all()

    if not listings:
        return {"featured": [], "listings": []}

    max_orders = max(
        (getattr(l.stats, "orders_count", 0) or 0 for l in listings),
        default=1
    ) or 1
    max_values = {"orders": max_orders, "price": 1}

    impressions_result = await db.execute(select(func.sum(GigStats.impressions_count)))
    total_impressions = impressions_result.scalar() or 1

    for listing in listings:
        listing.relevance_score = 1.0 if q and q.lower() in listing.title.lower() else 0.5
        listing.cache_score = calculate_final_score(listing, max_values, total_impressions)

    sorted_listings = sorted(listings, key=lambda x: getattr(x, "cache_score", 0), reverse=True)

    top_3 = sorted_listings[:3]
    new_gigs = [
        l for l in sorted_listings[3:]
        if (datetime.now(timezone.utc).date() - l.created_at.date()).days < 3
    ]
    boosted_new = [new_gigs[0]] if new_gigs else []

    featured = top_3 + boosted_new
    featured_ids = {f.id for f in featured}
    all_gigs = [l for l in sorted_listings if l.id not in featured_ids]

    return {"featured": featured, "listings": all_gigs}
