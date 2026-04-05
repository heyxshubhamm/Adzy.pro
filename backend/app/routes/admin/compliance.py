from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.models import User, ComplianceRecord, AuditLog

router = APIRouter(prefix="/admin/compliance", tags=["admin_compliance"])

@router.get("/records")
async def get_compliance_records(
    user_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = select(ComplianceRecord).order_by(desc(ComplianceRecord.created_at))
    if user_id:
        query = query.where(ComplianceRecord.user_id == user_id)
    if status:
        query = query.where(ComplianceRecord.status == status)
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()

@router.post("/records/{record_id}/verify")
async def verify_compliance(
    record_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    result = await db.execute(select(ComplianceRecord).where(ComplianceRecord.id == record_id))
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(404, "Record not found")
    
    record.status = "VERIFIED"
    record.handled_by_id = admin.id
    record.completed_at = datetime.now(timezone.utc)
    
    # Sync with user
    user_result = await db.execute(select(User).where(User.id == record.user_id))
    user = user_result.scalar_one_or_none()
    if user:
        user.kyc_verified = True
    
    db.add(AuditLog(
        admin_id=admin.id,
        action="compliance.verify",
        target_type="compliance_record",
        target_id=record_id,
        new_value={"user_id": str(record.user_id)}
    ))
    
    await db.commit()
    return {"status": "verified", "user_id": record.user_id}
