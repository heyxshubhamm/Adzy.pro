import json
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Order, Payment
from app.schemas.schemas import PaymentCreate
from app.services.payments import create_razorpay_order, verify_webhook_signature
from app.core.config import settings
from decimal import Decimal

router = APIRouter(tags=["payments"])

@router.post("/create", response_model=dict)
async def create_payment(
    payment_in: PaymentCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Order).where(Order.id == payment_in.order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if str(order.buyer_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not your order")

    if order.status != "PENDING":
        raise HTTPException(status_code=400, detail="Order already processed")

    # Create Razorpay order
    rzp_order = create_razorpay_order(float(order.price))

    db_payment = Payment(
        order_id=order.id,
        razorpay_order_id=rzp_order["id"],
        amount=order.price,
        platform_fee=order.price * Decimal("0.2"),
        seller_earning=order.price * Decimal("0.8"),
        status="PENDING"
    )
    db.add(db_payment)
    await db.commit()

    return {
        "razorpay_order_id": rzp_order["id"],
        "amount": rzp_order["amount"],
        "currency": rzp_order.get("currency", "INR"),
        "key_id": settings.RAZORPAY_KEY_ID,
    }


@router.post("/webhook")
async def razorpay_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature")

    # Verify cryptographic integrity
    try:
        verify_webhook_signature(payload.decode(), signature, settings.RAZORPAY_WEBHOOK_SECRET)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event = json.loads(payload)
    event_type = event.get("event")

    if event_type == "payment.captured":
        entity = event["payload"]["payment"]["entity"]
        rzp_order_id = entity.get("order_id")
        rzp_payment_id = entity.get("id")

        result = await db.execute(
            select(Payment).where(Payment.razorpay_order_id == rzp_order_id)
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.razorpay_payment_id = rzp_payment_id
            payment.status = "CAPTURED"

            # Transition order to PAID
            order_result = await db.execute(
                select(Order).where(Order.id == payment.order_id)
            )
            order = order_result.scalar_one_or_none()
            if order and order.status == "PENDING":
                order.status = "PAID"

            await db.commit()

    elif event_type == "payment.failed":
        entity = event["payload"]["payment"]["entity"]
        rzp_order_id = entity.get("order_id")

        result = await db.execute(
            select(Payment).where(Payment.razorpay_order_id == rzp_order_id)
        )
        payment = result.scalar_one_or_none()
        if payment:
            payment.status = "FAILED"
            await db.commit()

    return {"status": "ok"}
