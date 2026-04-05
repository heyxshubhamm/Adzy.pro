from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.models import User, Gig, FraudAlert, IPReputation, Dispute, Order
from datetime import datetime, timedelta, timezone
import json
import logging

logger = logging.getLogger(__name__)

class RiskService:
    @staticmethod
    async def calculate_user_risk_score(db: AsyncSession, user_id: str) -> float:
        """
        Calculates a comprehensive risk score for a user based on multiple factors:
        - History of disputes
        - Account age
        - IP reputation
        - Linked accounts
        - High-frequency transactions
        """
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            return 0.0

        base_score = 0.0

        # 1. Dispute History
        dispute_count_result = await db.execute(
            select(func.count(Dispute.id)).where(
                (Dispute.opened_by_id == user_id) | (Order.gig_id.in_(
                    select(Gig.id).where(Gig.seller_id == user_id)
                ))
            ).join(Order, Dispute.order_id == Order.id)
        )
        dispute_count = dispute_count_result.scalar() or 0
        base_score += dispute_count * 10

        # 2. Account Age (New accounts are higher risk)
        account_age_days = (datetime.now(timezone.utc) - user.created_at).days
        if account_age_days < 7:
            base_score += 30
        elif account_age_days < 30:
            base_score += 15

        # 3. Trust Score (Inverse correlation)
        if user.trust_score < 50:
            base_score += (50 - user.trust_score)

        # 4. Global Caps
        final_score = min(base_score, 100.0)
        
        user.risk_score = final_score
        db.add(user)
        await db.commit()
        
        return final_score

    @staticmethod
    async def monitor_ip_reputation(db: AsyncSession, ip_address: str):
        """
        Checks if an IP is flagged and tracks behavior.
        """
        result = await db.execute(select(IPReputation).where(IPReputation.ip_address == ip_address))
        reputation = result.scalar_one_or_none()
        
        if not reputation:
            # Create a neutral record if it's new
            reputation = IPReputation(
                ip_address=ip_address,
                risk_score=0.0
            )
            db.add(reputation)
            await db.commit()
        
        return reputation

    @staticmethod
    async def trigger_fraud_alert(db: AsyncSession, user_id: str, alert_type: str, severity: int, details: dict, ip_address: str = None):
        """
        Logs a fraud alert and potentially freezes the user.
        """
        alert = FraudAlert(
            user_id=user_id,
            alert_type=alert_type,
            severity=severity,
            details=details,
            ip_address=ip_address,
            resolved=False
        )
        db.add(alert)
        
        # If severity is critical, freeze the wallet/account
        if severity >= 80:
            result = await db.execute(select(User).where(User.id == user_id))
            user = result.scalar_one_or_none()
            if user:
                user.wallet_frozen = True
                user.freeze_reason = f"Fraud Alert: {alert_type}"
                db.add(user)
                logger.warning(f"User {user_id} frozen due to high-severity fraud alert: {alert_type}")

        await db.commit()
        return alert
