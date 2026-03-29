from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import User, Gig, Order

async def evaluate_publisher_level(user: User, db: AsyncSession) -> int:
    """
    Evaluates and returns the appropriate publisher level (0-4) based on performance.
    """
    # 1. Gather Metrics
    # Count completed orders for this seller
    orders_query = select(func.count(Order.id)).join(Gig).where(Gig.seller_id == user.id, Order.status == "COMPLETED")
    total_orders = (await db.execute(orders_query)).scalar() or 0
    
    completion_rate = float(user.completion_rate or 100.0)
    resp_time_h = float(user.response_speed_seconds or 3600) / 3600.0

    # Average rating across all user's gigs
    rating_query = select(func.avg(Gig.rating)).where(Gig.seller_id == user.id)
    avg_rating = (await db.execute(rating_query)).scalar() or 5.0
    avg_rating = float(avg_rating)
    
    repeat_rate = 0.0 
    rejection_rate = 0.0 
    on_time_delivery = float(user.on_time_delivery_rate or 100.0)
    conversion_rate = 10.0 

    # 🟢 Level 4: adzy.pro Choice
    if (total_orders >= 1000 and conversion_rate >= 15.0 and repeat_rate >= 30.0 and 
        avg_rating >= 4.7 and completion_rate >= 97.0 and resp_time_h <= 1.0 and rejection_rate <= 5.0):
        return 4
        
    # 🟣 Level 3: Top Rated
    if (total_orders >= 500 and completion_rate >= 95.0 and resp_time_h <= 3.0 and 
        avg_rating >= 4.5 and repeat_rate >= 20.0 and on_time_delivery >= 90.0 and rejection_rate <= 10.0):
        return 3
        
    # 🟡 Level 2: Experienced
    if (total_orders >= 200 and completion_rate >= 90.0 and resp_time_h <= 6.0 and 
        avg_rating >= 4.3 and repeat_rate >= 10.0 and rejection_rate <= 15.0):
        return 2
        
    # 🔵 Level 01: Trusted Entry
    if (total_orders >= 50 and completion_rate >= 85.0 and resp_time_h <= 12.0 and 
        avg_rating >= 4.0 and rejection_rate <= 20.0):
        return 1
        
    return 0

async def run_daily_level_update(db: AsyncSession):
    """
    Cron-job style function to update all seller levels.
    """
    result = await db.execute(select(User).where(User.role == "seller")) # Fixed role casing
    sellers = result.scalars().all()
    for seller in sellers:
        new_level = await evaluate_publisher_level(seller, db)
        seller.publisher_level = new_level
        seller.last_level_eval = datetime.now(timezone.utc)
    await db.commit()

def get_level_multiplier(level: int) -> float:
    multipliers = {
        0: 1.0,
        1: 1.05,
        2: 1.10,
        3: 1.20,
        4: 1.35
    }
    return multipliers.get(level, 1.0)
