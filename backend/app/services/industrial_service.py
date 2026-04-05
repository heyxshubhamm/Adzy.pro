import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy import select, func, update
from ..db.session import async_session_factory
from ..models.models import (
    User, Gig, Payment, FraudAlert, 
    ComplianceRecord, Dispute, AuditLog
)

logger = logging.getLogger(__name__)

class IndustrialService:
    @staticmethod
    async def get_dashboard_metrics() -> Dict[str, Any]:
        """
        Aggregates high-intensity metrics for the mission control dashboard.
        """
        async with async_session_factory() as session:
            now = datetime.utcnow()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            week_start = today_start - timedelta(days=7)

            # --- User Metrics ---
            total_users_stmt = select(func.count(User.id))
            new_users_stmt = select(func.count(User.id)).where(User.created_at >= today_start)
            banned_users_stmt = select(func.count(User.id)).where(User.is_active == False)
            
            # --- Transaction Metrics ---
            volume_today_stmt = select(func.sum(Payment.amount)).where(Payment.created_at >= today_start)
            volume_week_stmt = select(func.sum(Payment.amount)).where(Payment.created_at >= week_start)
            
            # --- Risk & Moderation ---
            open_alerts_stmt = select(func.count(FraudAlert.id)).where(FraudAlert.resolved == False)
            critical_alerts_stmt = select(func.count(FraudAlert.id)).where(FraudAlert.resolved == False, FraudAlert.severity >= 4)
            pending_gigs_stmt = select(func.count(Gig.id)).where(Gig.status == 'pending')
            
            # Execute all (Simplified sequential for stability, could be gathered)
            total_users = (await session.execute(total_users_stmt)).scalar() or 0
            new_users = (await session.execute(new_users_stmt)).scalar() or 0
            banned_users = (await session.execute(banned_users_stmt)).scalar() or 0
            volume_today = (await session.execute(volume_today_stmt)).scalar() or 0
            volume_week = (await session.execute(volume_week_stmt)).scalar() or 0
            open_alerts = (await session.execute(open_alerts_stmt)).scalar() or 0
            high_risk_alerts = (await session.execute(critical_alerts_stmt)).scalar() or 0
            pending_gigs = (await session.execute(pending_gigs_stmt)).scalar() or 0

            return {
                "total_users": total_users,
                "new_users_today": new_users,
                "banned_users": banned_users,
                "volume_today": float(volume_today),
                "volume_week": float(volume_week),
                "open_fraud_alerts": open_alerts,
                "high_risk_alerts": high_risk_alerts,
                "pending_gigs": pending_gigs,
                "status": "operational"
            }

    @staticmethod
    async def recalculate_user_risk(user_id: str) -> float:
        """
        Dynamically calculates a user's risk score based on behavioral signals.
        """
        async with async_session_factory() as session:
            # Signals: Unresolved alerts, dispute frequency, account age, KYC status
            alerts_stmt = select(FraudAlert).where(FraudAlert.user_id == user_id, FraudAlert.resolved == False)
            alerts = (await session.execute(alerts_stmt)).scalars().all()
            
            base_score = 0
            for alert in alerts:
                base_score += (alert.severity * 15) # Max 5*15 = 75
            
            # Clamp to 0-100
            final_score = min(100, base_score)
            
            await session.execute(
                update(User)
                .where(User.id == user_id)
                .values(risk_score=final_score)
            )
            await session.commit()
            return final_score

    @staticmethod
    async def resolve_fraud_alert(alert_id: str, admin_id: str) -> bool:
        """
        Resolves a fraud alert and triggers a risk recalculation for the user.
        """
        async with async_session_factory() as session:
            alert_stmt = select(FraudAlert).where(FraudAlert.id == alert_id)
            alert = (await session.execute(alert_stmt)).scalar_one_or_none()
            
            if not alert:
                return False
                
            alert.resolved = True
            user_id = alert.user_id
            
            # Create Audit Log
            audit = AuditLog(
                admin_id=admin_id,
                action="RESOLVE_FRAUD",
                target_type="FraudAlert",
                target_id=alert_id,
                changes={"old_status": "open", "new_status": "resolved"}
            )
            session.add(audit)
            await session.commit()
            
            # Trigger background recalculation (Sync call for simplicity in this logic layer)
            await IndustrialService.recalculate_user_risk(user_id)
            return True

    @staticmethod
    async def get_seller_churn(days_inactive: int = 30) -> List[Dict[str, Any]]:
        """
        Identified sellers who haven't had an order in 30+ days.
        """
        async with async_session_factory() as session:
            cutoff = datetime.utcnow() - timedelta(days=days_inactive)
            # Use Order aliased as OrderModel or just use direct Order if imported
            from ..models.models import User, Order
            stmt = (
                select(User.id, User.username, User.email, func.max(Order.created_at).label("last_order"))
                .join(Order, Order.seller_id == User.id, isouter=True)
                .where(User.role == "seller", User.is_active == True)
                .group_by(User.id)
                .having((func.max(Order.created_at) < cutoff) | (func.max(Order.created_at) == None))
                .order_by(func.max(Order.created_at).asc().nullsfirst())
                .limit(50)
            )
            result = await session.execute(stmt)
            return [
                {
                    "id": str(r.id), "username": r.username, "email": r.email,
                    "last_order": r.last_order.isoformat() if r.last_order else None,
                    "days_inactive": (datetime.utcnow() - r.last_order.replace(tzinfo=None)).days if r.last_order else 999
                } for r in result.all()
            ]

    @staticmethod
    async def get_buyer_ltv() -> List[Dict[str, Any]]:
        """
        Calculates Lifetime Value (LTV) for top buyers.
        """
        async with async_session_factory() as session:
            from ..models.models import User, Order, Payment
            stmt = (
                select(User.id, User.username, func.count(Order.id).label("order_count"), 
                       func.sum(Payment.amount).label("ltv"), func.max(Order.created_at).label("last_order"))
                .join(Order, Order.buyer_id == User.id)
                .join(Payment, Payment.order_id == Order.id)
                .where(User.role == "buyer", Payment.status.in_(["HELD", "RELEASED", "CAPTURED"]))
                .group_by(User.id)
                .order_by(func.desc("ltv"))
                .limit(50)
            )
            result = await session.execute(stmt)
            return [
                {
                    "id": str(r.id), "username": r.username,
                    "order_count": r.order_count, "ltv": float(r.ltv),
                    "last_order": r.last_order.isoformat()
                } for r in result.all()
            ]

    @staticmethod
    async def get_top_sellers(limit: int = 20) -> List[Dict[str, Any]]:
        """
        Identifies highest-earning sellers with rating telemetry.
        """
        async with async_session_factory() as session:
            from ..models.models import User, Order, Payment, Review
            stmt = (
                select(User.id, User.username, func.count(Order.id).label("order_count"),
                       func.sum(Payment.seller_earning).label("earnings"), func.avg(Review.rating).label("avg_rating"))
                .join(Order, Order.seller_id == User.id)
                .join(Payment, Payment.order_id == Order.id)
                .join(Review, Review.seller_id == User.id, isouter=True)
                .where(Payment.status.in_(["RELEASED", "CAPTURED"]))
                .group_by(User.id)
                .order_by(func.desc("earnings"))
                .limit(limit)
            )
            result = await session.execute(stmt)
            return [
                {
                    "id": str(r.id), "username": r.username,
                    "order_count": r.order_count,
                    "earnings": round(float(r.earnings), 2) if r.earnings else 0.0,
                    "avg_rating": round(float(r.avg_rating), 2) if r.avg_rating else None
                } for r in result.all()
            ]
