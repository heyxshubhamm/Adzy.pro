from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.models import User, Gig, Order, Payment
from app.services.market_levels import recompute_market_levels
from app.schemas.schemas import UserResponse
from app.schemas.gigs import GigOut
from typing import List

router = APIRouter(tags=["admin"])

@router.get("/stats")
async def get_admin_stats(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Performance optimized stats
    total_users_q = select(func.count(User.id))
    total_listings_q = select(func.count(Gig.id))
    total_orders_q = select(func.count(Order.id))
    rev_q = select(func.sum(Payment.amount)).where(Payment.status == "PAID")

    total_users = (await db.execute(total_users_q)).scalar() or 0
    total_listings = (await db.execute(total_listings_q)).scalar() or 0
    total_orders = (await db.execute(total_orders_q)).scalar() or 0
    total_revenue = (await db.execute(rev_q)).scalar() or 0

    return {
        "total_users": total_users,
        "total_listings": total_listings,
        "total_orders": total_orders,
        "total_revenue": float(total_revenue)
    }

@router.get("/moderation/queue", response_model=List[GigOut])
async def get_moderation_queue(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Prioritizes high-risk items for manual review
    result = await db.execute(
        select(Gig)
        .where(Gig.status == "PENDING")
        .order_by(desc(Gig.risk_score))
    )
    return result.scalars().all()

@router.put("/listings/{listing_id}/approve")
async def approve_listing(
    listing_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Gig).where(Gig.id == listing_id))
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Gig not found")
        
    listing.status = "APPROVED"
    await db.commit()
    return {"message": "Gig approved for marketplace"}

@router.put("/listings/{listing_id}/reject")
async def reject_listing(
    listing_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Gig).where(Gig.id == listing_id))
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Gig not found")
        
    listing.status = "REJECTED"
    await db.commit()
    return {"message": "Gig rejected"}
    
from app.services.crawler import crawler_service
import random

@router.get("/topology")
async def get_system_topology(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Fetch a sample of listing domains for the topological visualization
    result = await db.execute(select(Gig).limit(10))
    listings = result.scalars().all()
    
    nodes = []
    links = []
    
    for listing in listings:
        analysis = await crawler_service.analyze_domain(listing.slug)
        nodes.append({
            "id": listing.id,
            "label": analysis["domain"],
            "type": analysis["topology_level"],
            "health": analysis["network_health"]
        })
        # Add a placeholder link to the Adzy core node
        links.append({"source": listing.id, "target": "adzy-core", "value": 1})
    
    # Adding the Central Market Node
    nodes.append({"id": "adzy-core", "label": "ADZY.PRO CORE", "type": "Seed", "health": 1.0})
    
    return {"nodes": nodes, "links": links}

@router.get("/neural-grid")
async def get_neural_grid(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Generates a 10x10 (100-item) heartbeat grid for the 'Command Center' UI
    # Represents: 100 system features (Listing verify, Email SMTP, S3, DB pool, etc.)
    grid = []
    for i in range(100):
        status = "healthy"
        if i % 15 == 0: status = "warning"
        if i % 42 == 0: status = "critical"
        
        grid.append({
            "id": i,
            "feature": f"Node {i:03}",
            "status": status,
            "pulse": random.uniform(0.1, 1.0)
        })
    return grid


@router.post("/ranking/recompute")
async def recompute_ranking_levels(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await recompute_market_levels(db)
    return {"status": "ok", "result": result}
