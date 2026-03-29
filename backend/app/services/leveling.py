from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import User, SellerProfile
from datetime import datetime, timezone, timedelta

class LevelingService:
    async def evaluate_publisher(self, user_id: str, db: AsyncSession):
        """
        Evaluates a publisher based on Adzy's meritocratic criteria.
        Returns the new level (0-4).
        """
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user or user.role != "seller":
            return 0

        profile = user.seller_profile
        if not profile:
            return 0

        # Criteria Metrics
        earnings = float(profile.total_earnings or 0.0)
        completion = float(user.completion_rate or 0.0)
        days_active = (datetime.now(timezone.utc) - user.created_at.replace(tzinfo=timezone.utc)).days
        orders = user.total_orders_completed or 0

        new_level = 0
        
        # Level 1: Starter
        if earnings >= 400 and orders >= 10 and days_active >= 30 and completion >= 90:
            new_level = 1
            
        # Level 2: Professional
        if earnings >= 2000 and orders >= 50 and days_active >= 60 and completion >= 90:
            new_level = 2
            
        # Level 3: Expert
        if earnings >= 10000 and orders >= 100 and days_active >= 120 and completion >= 95:
            new_level = 3
            
        # Level 4: Top Rated (Manual/Elite status)
        if earnings >= 20000 and orders >= 200 and days_active >= 180 and completion >= 98:
            new_level = 4

        if new_level != user.publisher_level:
            user.publisher_level = new_level
            user.last_level_eval = datetime.now(timezone.utc)
            await db.commit()
            print(f"User {user.username} promoted to Level {new_level}")

        return new_level

leveling_service = LevelingService()
