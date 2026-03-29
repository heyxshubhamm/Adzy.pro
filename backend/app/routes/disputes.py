from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timezone

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.models import User, Order, Dispute

router = APIRouter(tags=["disputes"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class DisputeCreate(BaseModel):
    reason: str = Field(..., min_length=20, max_length=2000)
    evidence_url: Optional[str] = None


class DisputeResolve(BaseModel):
    resolution: str = Field(..., pattern="^(resolved_buyer|resolved_seller|cancelled)$")
    admin_notes: Optional[str] = Field(None, max_length=2000)


def _fmt(d: Dispute) -> dict:
    return {
        "id": str(d.id),
        "order_id": str(d.order_id),
        "status": d.status,
        "reason": d.reason,
        "evidence_url": d.evidence_url,
        "admin_notes": d.admin_notes,
        "opened_by": {"username": d.opened_by.username} if d.opened_by else None,
        "resolved_by": {"username": d.resolved_by.username} if d.resolved_by else None,
        "created_at": d.created_at.isoformat(),
        "resolved_at": d.resolved_at.isoformat() if d.resolved_at else None,
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/orders/{order_id}/dispute", response_model=dict, status_code=201)
async def open_dispute(
    order_id: str,
    body: DisputeCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.id == order_id)
        .options(selectinload(Order.gig))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    gig_seller_id = str(order.gig.seller_id) if order.gig else None
    if str(order.buyer_id) != str(user.id) and gig_seller_id != str(user.id):
        raise HTTPException(status_code=403, detail="Not a party to this order")

    if order.status not in ("PAID", "IN_PROGRESS", "COMPLETED"):
        raise HTTPException(status_code=400, detail="Cannot dispute an order in this state")

    # One dispute per order
    existing = await db.execute(select(Dispute).where(Dispute.order_id == order.id))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Dispute already exists for this order")

    dispute = Dispute(
        order_id=order.id,
        opened_by_id=user.id,
        reason=body.reason,
        evidence_url=body.evidence_url,
    )
    db.add(dispute)
    order.status = "DISPUTED"
    await db.commit()
    return {"message": "Dispute opened", "id": str(dispute.id)}


@router.get("/orders/{order_id}/dispute", response_model=dict)
async def get_dispute(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.id == order_id)
        .options(selectinload(Order.gig))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    gig_seller_id = str(order.gig.seller_id) if order.gig else None
    if str(order.buyer_id) != str(user.id) and gig_seller_id != str(user.id) and user.role != "admin":
        raise HTTPException(status_code=403, detail="Access denied")

    d_result = await db.execute(
        select(Dispute).where(Dispute.order_id == order_id)
        .options(selectinload(Dispute.opened_by), selectinload(Dispute.resolved_by))
    )
    dispute = d_result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="No dispute found for this order")

    return _fmt(dispute)


@router.patch("/disputes/{dispute_id}/resolve", response_model=dict)
async def resolve_dispute(
    dispute_id: str,
    body: DisputeResolve,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dispute).where(Dispute.id == dispute_id)
        .options(selectinload(Dispute.opened_by), selectinload(Dispute.resolved_by))
    )
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")
    if dispute.status != "open":
        raise HTTPException(status_code=400, detail="Dispute already resolved")

    dispute.status = body.resolution
    dispute.admin_notes = body.admin_notes
    dispute.resolved_by_id = admin.id
    dispute.resolved_at = datetime.now(timezone.utc)

    # Update order status based on resolution
    order_result = await db.execute(select(Order).where(Order.id == dispute.order_id))
    order = order_result.scalar_one_or_none()
    if order:
        if body.resolution == "resolved_buyer":
            order.status = "CANCELLED"
        elif body.resolution == "resolved_seller":
            order.status = "COMPLETED"
        # "cancelled" leaves as DISPUTED for manual admin follow-up

    await db.commit()
    return {"message": f"Dispute resolved: {body.resolution}"}


@router.get("/admin/disputes", response_model=List[dict])
async def list_disputes(
    status: Optional[str] = "open",
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Dispute)
        .options(selectinload(Dispute.opened_by), selectinload(Dispute.resolved_by))
        .order_by(Dispute.created_at.desc())
    )
    if status:
        query = query.where(Dispute.status == status)

    result = await db.execute(query)
    return [_fmt(d) for d in result.scalars().all()]
