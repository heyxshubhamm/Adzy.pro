from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.models import GigStats
from uuid import UUID

router = APIRouter()

@router.post("/view/{gig_id}")
async def track_view(gig_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GigStats).where(GigStats.gig_id == gig_id))
    stats = result.scalar_one_or_none()
    if not stats:
        stats = GigStats(gig_id=gig_id)
        db.add(stats)
    
    stats.views_count += 1
    await db.commit()
    return {"status": "ok"}

@router.post("/click/{gig_id}")
async def track_click(gig_id: UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GigStats).where(GigStats.gig_id == gig_id))
    stats = result.scalar_one_or_none()
    if not stats:
        stats = GigStats(gig_id=gig_id)
        db.add(stats)
    
    stats.clicks_count += 1
    await db.commit()
    return {"status": "ok"}
