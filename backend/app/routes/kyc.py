"""
Simple KYC: seller submits a document URL (pre-signed S3 or Cloudinary link),
admin reviews and marks as verified/rejected.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field, AnyHttpUrl
from typing import Optional, List
from datetime import datetime, timezone

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.models import User, SellerProfile

router = APIRouter(tags=["kyc"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class KYCSubmit(BaseModel):
    document_url: str = Field(..., description="Pre-signed URL of the uploaded identity document")


class KYCReview(BaseModel):
    decision: str = Field(..., pattern="^(verified|rejected)$")
    reason: Optional[str] = Field(None, max_length=500)


class KYCStatusOut(BaseModel):
    kyc_status: str
    kyc_submitted_at: Optional[datetime] = None
    kyc_rejected_reason: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/seller/kyc/submit", response_model=dict)
async def submit_kyc(
    body: KYCSubmit,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role != "seller":
        raise HTTPException(status_code=403, detail="Only sellers can submit KYC")

    result = await db.execute(select(SellerProfile).where(SellerProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Seller profile not found. Complete onboarding first.")

    if profile.kyc_status == "verified":
        raise HTTPException(status_code=400, detail="KYC already verified")

    profile.kyc_document_url = body.document_url
    profile.kyc_status = "pending"
    profile.kyc_submitted_at = datetime.now(timezone.utc)
    profile.kyc_rejected_reason = None
    await db.commit()

    return {"message": "KYC document submitted. Review typically takes 1–2 business days."}


@router.get("/seller/kyc/status", response_model=KYCStatusOut)
async def get_kyc_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SellerProfile).where(SellerProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")

    return KYCStatusOut(
        kyc_status=profile.kyc_status,
        kyc_submitted_at=profile.kyc_submitted_at,
        kyc_rejected_reason=profile.kyc_rejected_reason,
    )


@router.get("/admin/kyc/queue", response_model=List[dict])
async def kyc_queue(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(SellerProfile)
        .where(SellerProfile.kyc_status == "pending")
        .order_by(SellerProfile.kyc_submitted_at.asc())
    )
    profiles = result.scalars().all()
    return [
        {
            "seller_profile_id": str(p.id),
            "user_id": str(p.user_id),
            "display_name": p.display_name,
            "kyc_submitted_at": p.kyc_submitted_at.isoformat() if p.kyc_submitted_at else None,
            "document_url": p.kyc_document_url,
        }
        for p in profiles
    ]


@router.patch("/admin/kyc/{profile_id}/review", response_model=dict)
async def review_kyc(
    profile_id: str,
    body: KYCReview,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SellerProfile).where(SellerProfile.id == profile_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    if profile.kyc_status != "pending":
        raise HTTPException(status_code=400, detail="Only pending KYC can be reviewed")

    profile.kyc_status = body.decision
    if body.decision == "rejected":
        profile.kyc_rejected_reason = body.reason
    else:
        profile.kyc_rejected_reason = None

    await db.commit()
    return {"message": f"KYC {body.decision}"}
