from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, Order, Gig, GigPackage, GigStats, SellerProfile
from app.schemas.schemas import OrderCreate, OrderResponse
from app.services.claude_service import claude_service
from app.services.leveling import leveling_service
from typing import List
from pydantic import BaseModel

router = APIRouter(tags=["orders"])

def _order_options():
    return (
        selectinload(Order.gig),
        selectinload(Order.package),
        selectinload(Order.payment),
    )

@router.post("", response_model=OrderResponse)
async def create_order(
    order_in: OrderCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Load gig with packages and stats
    result = await db.execute(
        select(Gig)
        .where(Gig.id == order_in.gig_id, Gig.status == "active")
        .options(selectinload(Gig.packages), selectinload(Gig.stats))
    )
    gig = result.scalar_one_or_none()
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")

    # Determine price from requested package or cheapest (basic) package
    package = None
    if order_in.package_id:
        pkg_result = await db.execute(
            select(GigPackage).where(
                GigPackage.id == order_in.package_id,
                GigPackage.gig_id == gig.id
            )
        )
        package = pkg_result.scalar_one_or_none()
        if not package:
            raise HTTPException(status_code=400, detail="Package not found for this gig")
    else:
        package = next((p for p in gig.packages if p.tier == "basic"), None)
        if not package and gig.packages:
            package = gig.packages[0]
        if not package:
            raise HTTPException(status_code=400, detail="Gig has no packages configured")

    db_order = Order(
        buyer_id=user.id,
        gig_id=gig.id,
        package_id=package.id,
        price=package.price,
        anchor_text=order_in.anchor_text,
        target_url=order_in.target_url,
        status="PENDING"
    )
    db.add(db_order)

    if gig.stats:
        gig.stats.orders_count += 1

    await db.commit()

    result2 = await db.execute(
        select(Order).where(Order.id == db_order.id).options(*_order_options())
    )
    return result2.scalar_one()


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order).where(Order.id == order_id).options(*_order_options())
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    gig_seller_id = str(order.gig.seller_id) if order.gig else None
    if str(order.buyer_id) != str(user.id) and gig_seller_id != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    return order


class DeliveryIn(BaseModel):
    proof_url: str
    notes: str | None = None

@router.patch("/{order_id}/deliver", response_model=OrderResponse)
async def deliver_order(
    order_id: str,
    body: DeliveryIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order).where(Order.id == order_id).options(*_order_options())
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if not order.gig or str(order.gig.seller_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not your order to deliver")
    if order.status not in ("PAID", "PENDING"):
        raise HTTPException(status_code=400, detail=f"Cannot deliver order with status {order.status}")

    order.status = "IN_PROGRESS"
    order.proof_url = body.proof_url
    order.verification_status = "PENDING"

    await db.commit()
    result2 = await db.execute(
        select(Order).where(Order.id == order.id).options(*_order_options())
    )
    return result2.scalar_one()


@router.post("/{order_id}/verify", response_model=OrderResponse)
async def verify_order_ai(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order).where(Order.id == order_id).options(*_order_options())
    )
    order = result.scalar_one_or_none()

    if not order or not order.proof_url:
        raise HTTPException(status_code=400, detail="Order not ready for verification")

    report = await claude_service.verify_placement(order.proof_url, order.target_url)

    order.verification_status = report["status"]
    order.ai_verification_report = report["report"]

    await db.commit()
    result2 = await db.execute(
        select(Order).where(Order.id == order.id).options(*_order_options())
    )
    return result2.scalar_one()


@router.post("/{order_id}/complete", response_model=OrderResponse)
async def complete_order(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.gig).selectinload(Gig.seller).selectinload(User.seller_profile),
            selectinload(Order.package),
            selectinload(Order.payment),
        )
    )
    order = result.scalar_one_or_none()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if str(order.buyer_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Only the buyer can complete the order")
    if order.status == "COMPLETED":
        raise HTTPException(status_code=400, detail="Order already completed")

    order.status = "COMPLETED"

    if order.gig and order.gig.seller:
        seller = order.gig.seller
        seller.total_orders_completed += 1
        if seller.seller_profile:
            profile = seller.seller_profile
            profile.total_earnings = float(profile.total_earnings or 0.0) + float(order.price)
            profile.completed_orders += 1
        await leveling_service.evaluate_publisher(seller.id, db)

    await db.commit()
    result2 = await db.execute(
        select(Order).where(Order.id == order.id).options(*_order_options())
    )
    return result2.scalar_one()


@router.get("", response_model=List[OrderResponse])
async def get_my_orders(
    role: str = "buyer",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if role == "seller":
        query = (
            select(Order)
            .join(Gig, Order.gig_id == Gig.id)
            .where(Gig.seller_id == user.id)
        )
    else:
        query = select(Order).where(Order.buyer_id == user.id)

    result = await db.execute(
        query.options(*_order_options()).order_by(Order.created_at.desc())
    )
    return result.scalars().all()
