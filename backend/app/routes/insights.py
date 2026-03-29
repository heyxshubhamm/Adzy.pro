from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import Gig, GigStats
from app.services.claude_service import claude_service
import uuid
from typing import List

router = APIRouter()

@router.get("/publisher/{user_id}")
async def get_publisher_insights(user_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    """
    Analyzes all gigs of a publisher and provides AI revenue tips.
    """
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Gig).where(Gig.seller_id == user_id).options(selectinload(Gig.stats))
    )
    listings = result.scalars().all()
    if not listings:
        return {"tips": "No gigs found. Create a gig to see insights."}
    
    # Aggregate stats for analysis
    stats_data = []
    for l in listings:
        orders_count = l.stats.orders_count if l.stats else 0
        clicks_count = l.stats.clicks_count if l.stats else 0
        cr = orders_count / (clicks_count or 1)
        # Using getattr since some industrialization fields might be missing in legacy data
        dr = getattr(l, 'dr', 0)
        price = getattr(l, 'price', 0)
        stats_data.append(f"Gig: {l.title}, DR: {dr}, Price: {price}, Orders: {orders_count}, CR: {cr}")
    
    summary = "\n".join(stats_data)
    tips = await claude_service.generate_market_insights(summary)
    
    return {
        "user_id": user_id,
        "listing_count": len(listings),
        "ai_recommendations": tips
    }
