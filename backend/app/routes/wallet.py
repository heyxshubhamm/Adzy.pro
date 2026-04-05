"""
Wallet + Payout Routes

Seller flow:  GET /wallet/me  →  POST /wallet/withdraw  →  Admin approves
Buyer flow:   GET /wallet/me  (shows credit balance if ever pre-funded)
Admin flow:   GET /admin/withdrawals  →  PATCH /admin/withdrawals/{id}
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, func
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime, timezone
from decimal import Decimal
import uuid as uuid_lib

from app.db.session import get_db
from app.core.dependencies import get_current_user, require_admin
from app.models.models import User, Wallet, WithdrawalRequest, WalletTransaction, AuditLog

seller_router = APIRouter(prefix="/wallet", tags=["wallet"])
admin_router  = APIRouter(prefix="/admin/withdrawals", tags=["admin-payouts"])

# ════════════════════════════════════════════════════════════════════
# SCHEMAS
# ════════════════════════════════════════════════════════════════════

class WithdrawIn(BaseModel):
    amount: float
    method: str             # paypal | bank_transfer | crypto
    details: dict = {}      # account info (encrypted at rest in prod)

    @field_validator("amount")
    @classmethod
    def must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("Withdrawal amount must be greater than 0")
        return v

    @field_validator("method")
    @classmethod
    def valid_method(cls, v: str) -> str:
        allowed = {"paypal", "bank_transfer", "crypto"}
        if v not in allowed:
            raise ValueError(f"Method must be one of: {allowed}")
        return v

class AdminProcessIn(BaseModel):
    status:      str            # completed | rejected
    admin_notes: Optional[str] = None

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in {"completed", "rejected"}:
            raise ValueError("Status must be 'completed' or 'rejected'")
        return v

# ════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════

async def _get_or_create_wallet(user_id, db: AsyncSession) -> Wallet:
    result = await db.execute(select(Wallet).where(Wallet.user_id == user_id))
    wallet = result.scalar_one_or_none()
    if not wallet:
        wallet = Wallet(user_id=user_id, balance=Decimal("0.00"), currency="USD")
        db.add(wallet)
        await db.flush()
    return wallet

# ════════════════════════════════════════════════════════════════════
# SELLER / BUYER ROUTES
# ════════════════════════════════════════════════════════════════════

@seller_router.get("/me")
async def get_my_wallet(
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Get the current user's wallet balance and recent transactions."""
    wallet = await _get_or_create_wallet(user.id, db)
    await db.commit()

    txn_result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet.id)
        .order_by(desc(WalletTransaction.created_at))
        .limit(20)
    )
    txns = txn_result.scalars().all()

    return {
        "id":         str(wallet.id),
        "balance":    float(wallet.balance),
        "currency":   wallet.currency,
        "updated_at": wallet.updated_at,
        "transactions": [
            {
                "id":               str(t.id),
                "amount":           float(t.amount),
                "transaction_type": t.transaction_type,
                "description":      t.description,
                "status":           t.status,
                "created_at":       t.created_at,
            }
            for t in txns
        ],
    }

@seller_router.post("/withdraw", status_code=201)
async def request_withdrawal(
    body: WithdrawIn,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Seller requests a payout. Funds are reserved; admin must approve."""
    if user.role not in ("seller", "admin"):
        raise HTTPException(403, "Only sellers can request withdrawals")

    wallet = await _get_or_create_wallet(user.id, db)

    if float(wallet.balance) < body.amount:
        raise HTTPException(400, f"Insufficient balance. Available: ${wallet.balance:.2f}")

    min_withdrawal = 10.0
    if body.amount < min_withdrawal:
        raise HTTPException(400, f"Minimum withdrawal amount is ${min_withdrawal:.2f}")

    # Reserve the funds
    wallet.balance = Decimal(str(float(wallet.balance) - body.amount))

    withdrawal = WithdrawalRequest(
        wallet_id=wallet.id,
        amount=Decimal(str(body.amount)),
        method=body.method,
        details=body.details,
        status="requested",
    )
    db.add(withdrawal)
    await db.flush()

    # Ledger entry
    db.add(WalletTransaction(
        wallet_id=wallet.id,
        withdrawal_id=withdrawal.id,
        amount=Decimal(str(-body.amount)),
        transaction_type="withdrawal",
        description=f"Withdrawal request via {body.method} — pending admin approval",
        reference_id=f"wr-{withdrawal.id}",
        status="pending",
    ))

    await db.commit()
    await db.refresh(withdrawal)

    return {
        "id":     str(withdrawal.id),
        "amount": body.amount,
        "method": body.method,
        "status": withdrawal.status,
        "message": "Withdrawal request submitted. An admin will process it within 1-3 business days.",
    }

@seller_router.get("/withdrawals")
async def my_withdrawals(
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """List the current seller's withdrawal requests."""
    wallet = await _get_or_create_wallet(user.id, db)
    await db.commit()

    result = await db.execute(
        select(WithdrawalRequest)
        .where(WithdrawalRequest.wallet_id == wallet.id)
        .order_by(desc(WithdrawalRequest.requested_at))
    )
    reqs = result.scalars().all()
    return [
        {
            "id":           str(r.id),
            "amount":       float(r.amount),
            "method":       r.method,
            "status":       r.status,
            "admin_notes":  r.admin_notes,
            "requested_at": r.requested_at,
            "processed_at": r.processed_at,
        }
        for r in reqs
    ]

# ════════════════════════════════════════════════════════════════════
# ADMIN PAYOUT MANAGEMENT
# ════════════════════════════════════════════════════════════════════

@admin_router.get("/")
async def admin_list_withdrawals(
    status: Optional[str] = None,
    page:   int = 1,
    limit:  int = 50,
    db:     AsyncSession = Depends(get_db),
    _:      User         = Depends(require_admin),
):
    """List all withdrawal requests, filterable by status."""
    query = (
        select(WithdrawalRequest)
        .order_by(desc(WithdrawalRequest.requested_at))
        .offset((page - 1) * limit)
        .limit(limit)
    )
    if status:
        query = query.where(WithdrawalRequest.status == status)

    result = await db.execute(query)
    reqs = result.scalars().all()

    # Total count
    count_q = select(func.count()).select_from(WithdrawalRequest)
    if status:
        count_q = count_q.where(WithdrawalRequest.status == status)
    total = (await db.execute(count_q)).scalar()

    return {
        "total": total,
        "page":  page,
        "items": [
            {
                "id":           str(r.id),
                "wallet_id":    str(r.wallet_id),
                "amount":       float(r.amount),
                "method":       r.method,
                "status":       r.status,
                "admin_notes":  r.admin_notes,
                "requested_at": r.requested_at,
                "processed_at": r.processed_at,
            }
            for r in reqs
        ],
    }

@admin_router.patch("/{withdrawal_id}")
async def admin_process_withdrawal(
    withdrawal_id: str,
    body:          AdminProcessIn,
    db:            AsyncSession = Depends(get_db),
    admin:         User         = Depends(require_admin),
):
    """
    Admin approves ('completed') or rejects a withdrawal request.
    On rejection, funds are credited back to the seller's wallet.
    """
    result = await db.execute(
        select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id)
    )
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Withdrawal request not found")

    if req.status not in ("requested", "processing"):
        raise HTTPException(400, f"Cannot process a request in '{req.status}' state")

    old_status = req.status
    req.status       = body.status
    req.admin_notes  = body.admin_notes
    req.processed_at = datetime.now(timezone.utc)
    req.processed_by = admin.id

    # Update the pending ledger entry
    txn_result = await db.execute(
        select(WalletTransaction).where(WalletTransaction.withdrawal_id == req.id)
    )
    txn = txn_result.scalar_one_or_none()

    if body.status == "completed":
        if txn:
            txn.status = "success"
    elif body.status == "rejected":
        # Refund back to seller wallet
        wallet_result = await db.execute(select(Wallet).where(Wallet.id == req.wallet_id))
        wallet = wallet_result.scalar_one_or_none()
        if wallet:
            wallet.balance = Decimal(str(float(wallet.balance) + float(req.amount)))
            db.add(WalletTransaction(
                wallet_id=wallet.id,
                withdrawal_id=req.id,
                amount=req.amount,
                transaction_type="refund",
                description=f"Withdrawal rejected by admin — funds returned",
                reference_id=f"wr-refund-{req.id}",
                status="success",
            ))
        if txn:
            txn.status = "failed"

    db.add(AuditLog(
        admin_id=admin.id,
        action=f"withdrawal.{body.status}",
        target_type="withdrawal_request",
        target_id=str(req.id),
        old_value={"status": old_status},
        new_value={"status": body.status, "admin_notes": body.admin_notes},
    ))
    await db.commit()
    return {"message": f"Withdrawal {body.status}", "id": withdrawal_id}

@admin_router.patch("/{withdrawal_id}/mark-processing")
async def admin_mark_processing(
    withdrawal_id: str,
    db:   AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    result = await db.execute(select(WithdrawalRequest).where(WithdrawalRequest.id == withdrawal_id))
    req = result.scalar_one_or_none()
    if not req:
        raise HTTPException(404, "Not found")
    req.status = "processing"
    db.add(AuditLog(
        admin_id=admin.id, action="withdrawal.processing",
        target_type="withdrawal_request", target_id=str(req.id),
        old_value={"status": "requested"}, new_value={"status": "processing"},
    ))
    await db.commit()
    return {"message": "Marked as processing"}
