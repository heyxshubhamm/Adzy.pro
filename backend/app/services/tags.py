from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import Gig, GigStats
from sqlalchemy import func
from datetime import datetime, timezone, timedelta

TAG_PRIORITY = {
    "Trending": 1.15,
    "Best Seller": 1.20,
    "Hot": 1.10,
    "Recommended": 1.08,
    "Limited Deals": 1.05
}

def calculate_tag_scores(listing: Gig):
    """
    Computes tag eligibility for a gig.
    Trending > Best Seller > Hot > Recommended > Limited Deals
    """
    stats = listing.stats
    if not stats:
        return None, 1.0

    # 1. Trending (Growth Signal)
    sales_velocity = stats.orders_count 
    ctr = stats.clicks_count / (stats.impressions_count or 1)
    trending_score = (sales_velocity * 0.5) + (ctr * 0.3)
    
    if trending_score > 5.0:
        return "Trending", 1.15

    # 2. Best Seller (Trust Signal)
    if stats.orders_count > 50 and (stats.orders_count / (stats.clicks_count or 1)) > 0.1:
        return "Best Seller", 1.20

    # 3. Hot (Consistency)
    if stats.orders_count > 20 and ctr > 0.05:
        return "Hot", 1.10

    # Default
    return None, 1.0

async def update_all_tags(db: AsyncSession):
    result = await db.execute(select(Gig))
    listings = result.scalars().all()
    for l in listings:
        tag, boost = calculate_tag_scores(l)
        l.current_tag = tag
        l.tag_boost = boost
    await db.commit()
