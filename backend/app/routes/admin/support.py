from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.models import User, SupportTicket, Dispute
from typing import List, Optional
from datetime import datetime, timezone
from app.models.models import User, SupportTicket, Dispute, AuditLog

router = APIRouter(prefix="/admin/support", tags=["admin_support"])

@router.get("/tickets")
async def get_support_tickets(
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    query = select(SupportTicket).order_by(desc(SupportTicket.created_at))
    if status:
        query = query.where(SupportTicket.status == status)
    if priority:
        query = query.where(SupportTicket.priority == priority)
    
    result = await db.execute(query.limit(limit))
    return result.scalars().all()

@router.post("/tickets/{ticket_id}/assign")
async def assign_ticket(
    ticket_id: str,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    result = await db.execute(select(SupportTicket).where(SupportTicket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    if not ticket:
        raise HTTPException(404, "Ticket not found")
    
    ticket.assigned_to_id = admin.id
    ticket.status = "in_progress"
    
    db.add(AuditLog(
        admin_id=admin.id,
        action="support.assign_ticket",
        target_type="support_ticket",
        target_id=ticket_id,
        new_value={"admin_id": str(admin.id)}
    ))
    await db.commit()
    return {"status": "assigned", "admin_id": admin.id}

@router.get("/disputes/sla-breach")
async def get_sla_breaches(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """
    Returns disputes that have exceeded their SLA deadline.
    """
    now = datetime.now(timezone.utc)
    query = select(Dispute).where(
        Dispute.status == "open",
        Dispute.sla_deadline < now
    ).order_by(Dispute.sla_deadline)
    
    result = await db.execute(query)
    return result.scalars().all()
