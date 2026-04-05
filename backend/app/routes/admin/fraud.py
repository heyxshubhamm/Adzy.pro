from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.models import User, FraudAlert, IPReputation
from app.services.risk_service import RiskService
from typing import List, Optional

router = APIRouter(prefix="/admin/fraud", tags=["admin_fraud"])

@router.get("/alerts")
async def get_fraud_alerts(
    severity: Optional[int] = Query(None),
    resolved: Optional[bool] = Query(None),
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = select(FraudAlert).order_by(desc(FraudAlert.created_at))
    if severity is not None:
        query = query.where(FraudAlert.severity >= severity)
    if resolved is not None:
        query = query.where(FraudAlert.resolved == resolved)
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    result = await db.execute(select(FraudAlert).where(FraudAlert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(404, "Alert not found")
    
    alert.resolved = True
    await db.commit()
    return {"status": "resolved"}

@router.get("/ip-reputation")
async def get_ip_reputation(
    ip: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    reputation = await RiskService.monitor_ip_reputation(db, ip)
    return reputation

@router.post("/users/{user_id}/freeze")
async def freeze_user(
    user_id: str,
    reason: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    
    user.wallet_frozen = True
    user.freeze_reason = reason
    await db.commit()
    return {"status": "frozen", "user_id": user_id}
