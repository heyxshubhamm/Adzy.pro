from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.models import User, Gig, Order, Payment, AuditLog
from app.services.market_levels import recompute_market_levels
from app.schemas.schemas import UserResponse
from app.schemas.gigs import GigOut
from typing import List

router = APIRouter(tags=["admin"])

@router.get("/stats")
async def get_admin_stats(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    total_users   = await db.scalar(select(func.count()).select_from(User))
    total_sellers = await db.scalar(select(func.count()).select_from(User).where(User.role=="seller"))
    total_buyers  = await db.scalar(select(func.count()).select_from(User).where(User.role=="buyer"))
    total_gigs    = await db.scalar(select(func.count()).select_from(Gig).where(Gig.status=="active"))
    total_orders  = await db.scalar(select(func.count()).select_from(Order))
    pending_orders= await db.scalar(select(func.count()).select_from(Order).where(Order.status=="PENDING"))
    total_revenue = await db.scalar(select(func.sum(Payment.amount)).where(Payment.status=="RELEASED")) or 0
    platform_fees = await db.scalar(select(func.sum(Payment.platform_fee)).where(Payment.status=="RELEASED")) or 0

    return {
        "users":         {"total": total_users or 0, "sellers": total_sellers or 0, "buyers": total_buyers or 0},
        "gigs":          {"active": total_gigs or 0},
        "orders":        {"total": total_orders or 0, "pending": pending_orders or 0},
        "revenue":       {"total": float(total_revenue), "platform_fee": float(platform_fees)},
    }

@router.get("/moderation/queue", response_model=List[GigOut])
async def get_moderation_queue(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Prioritizes high-risk items for manual review
    result = await db.execute(
        select(Gig)
        .where(Gig.status == "PENDING")
        .order_by(desc(Gig.risk_score))
    )
    return result.scalars().all()

@router.put("/gigs/{listing_id}/approve")
async def approve_listing(
    listing_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Gig).where(Gig.id == listing_id))
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Gig not found")
        
    listing.status = "APPROVED"
    await db.commit()
    return {"message": "Gig approved for marketplace"}

@router.put("/gigs/{listing_id}/reject")
async def reject_listing(
    listing_id: str,
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Gig).where(Gig.id == listing_id))
    listing = result.scalar_one_or_none()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Gig not found")
        
    listing.status = "REJECTED"
    await db.commit()
    return {"message": "Gig rejected"}
    
from app.services.crawler import crawler_service
import random

@router.get("/topology")
async def get_system_topology(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Fetch a sample of listing domains for the topological visualization
    result = await db.execute(select(Gig).limit(10))
    listings = result.scalars().all()
    
    nodes = []
    links = []
    
    for listing in listings:
        analysis = await crawler_service.analyze_domain(listing.slug)
        nodes.append({
            "id": listing.id,
            "label": analysis["domain"],
            "type": analysis["topology_level"],
            "health": analysis["network_health"]
        })
        # Add a placeholder link to the Adzy core node
        links.append({"source": listing.id, "target": "adzy-core", "value": 1})
    
    # Adding the Central Market Node
    nodes.append({"id": "adzy-core", "label": "ADZY.PRO CORE", "type": "Seed", "health": 1.0})
    
    return {"nodes": nodes, "links": links}

@router.get("/neural-grid")
async def get_neural_grid(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    # Generates a 10x10 (100-item) heartbeat grid for the 'Command Center' UI
    # Represents: 100 system features (Listing verify, Email SMTP, S3, DB pool, etc.)
    grid = []
    for i in range(100):
        status = "healthy"
        if i % 15 == 0: status = "warning"
        if i % 42 == 0: status = "critical"
        
        grid.append({
            "id": i,
            "feature": f"Node {i:03}",
            "status": status,
            "pulse": random.uniform(0.1, 1.0)
        })
    return grid


@router.post("/ranking/recompute")
async def recompute_ranking_levels(
    user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await recompute_market_levels(db)
    return {"status": "ok", "result": result}

# ════════════════════════════════════════════════════════════════════
# EXTENDED SYSTEM ADMINISTRATION (CRUD & MODERATION)
# ════════════════════════════════════════════════════════════════════

from fastapi import Query
from pydantic import BaseModel
from typing import Optional
from sqlalchemy import update
from app.models.models import SellerProfile, Review
from app.auth.tokens import create_token_pair
from app.auth.cookies import set_auth_cookies
from app.auth.token_store import save_refresh_token
from fastapi.responses import Response
import math

# ── IMPERSONATION

@router.post("/impersonate/{user_id}")
async def impersonate_user(
    user_id:  str,
    response: Response,
    db:       AsyncSession = Depends(get_db),
    admin:    User         = Depends(require_admin),
):
    """Issue a JWT as any user — admin only. Useful for debugging."""
    result = await db.execute(select(User).where(User.id == user_id))
    target = result.scalar_one_or_none()
    if not target:
        raise HTTPException(404, "User not found")

    tokens = create_token_pair(str(target.id), target.role, target.email)
    await save_refresh_token(str(target.id), tokens.refresh_token)
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)

    return {
        "message":     f"Now acting as {target.email}",
        "impersonating": str(target.id),
        "role":        target.role,
    }

# ── USER MANAGEMENT

@router.get("/users")
async def list_users(
    search:  Optional[str] = Query(None),
    role:    Optional[str] = Query(None),
    page:    int            = Query(1, ge=1),
    limit:   int            = Query(20, ge=1, le=100),
    db:      AsyncSession   = Depends(get_db),
    _:       User           = Depends(require_admin),
):
    query = select(User).order_by(desc(User.created_at))
    if search:
        query = query.where(
            User.email.ilike(f"%{search}%") |
            User.username.ilike(f"%{search}%")
        )
    if role:
        query = query.where(User.role == role)

    total  = await db.scalar(select(func.count()).select_from(query.subquery()))
    users  = await db.execute(query.offset((page-1)*limit).limit(limit))
    return {
        "users": [
            {
                "id":         str(u.id),
                "email":      u.email,
                "username":   u.username,
                "role":       u.role,
                "is_active":  u.is_active,
                "is_verified":u.is_verified,
                "created_at": u.created_at,
            }
            for u in users.scalars()
        ],
        "total": total,
        "pages": math.ceil((total or 0) / limit),
    }

class UserUpdateIn(BaseModel):
    role:        Optional[str]  = None
    is_active:   Optional[bool] = None
    is_verified: Optional[bool] = None

@router.patch("/users/{user_id}")
async def update_user(
    user_id: str,
    body:    UserUpdateIn,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, "User not found")
    if str(user.id) == str(admin.id) and body.role and body.role != "admin":
        raise HTTPException(400, "Cannot remove your own admin role")

    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(user, field, val)

    if body.role == "seller":
        existing_sp = await db.execute(select(SellerProfile).where(SellerProfile.user_id == user.id))
        if not existing_sp.scalar_one_or_none():
            db.add(SellerProfile(
                user_id      = user.id,
                display_name = user.username,
                is_available = True,
                seller_level = "new",
            ))

    await db.commit()
    return {"message": "User updated", "role": user.role, "is_active": user.is_active}

@router.delete("/users/{user_id}", status_code=204)
async def ban_user(
    user_id: str,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(require_admin),
):
    if user_id == str(admin.id):
        raise HTTPException(400, "Cannot ban yourself")
    await db.execute(update(User).where(User.id == user_id).values(is_active=False))
    await db.commit()

# ── GIG MANAGEMENT

@router.get("/gigs")
async def list_gigs(
    status:  Optional[str] = Query(None),
    search:  Optional[str] = Query(None),
    page:    int            = Query(1, ge=1),
    limit:   int            = Query(20),
    db:      AsyncSession   = Depends(get_db),
    _:       User           = Depends(require_admin),
):
    query = select(Gig).order_by(desc(Gig.created_at))
    if status:
        query = query.where(Gig.status == status)
    if search:
        query = query.where(Gig.title.ilike(f"%{search}%"))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    gigs  = await db.execute(query.offset((page-1)*limit).limit(limit))
    return {
        "gigs": [
            {"id": str(g.id), "title": g.title, "slug": g.slug,
             "status": g.status, "seller_id": str(g.seller_id),
             "created_at": g.created_at}
            for g in gigs.scalars()
        ],
        "total": total,
        "pages": math.ceil((total or 0) / limit),
    }

class GigAdminUpdateIn(BaseModel):
    status: Optional[str] = None

@router.patch("/gigs/{gig_id}")
async def admin_update_gig(
    gig_id: str,
    body:   GigAdminUpdateIn,
    db:     AsyncSession = Depends(get_db),
    _:      User         = Depends(require_admin),
):
    result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig    = result.scalar_one_or_none()
    if not gig:
        raise HTTPException(404, "Gig not found")
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(gig, field, val)
    await db.commit()
    return {"message": "Gig updated", "status": gig.status}

# ── ORDER MANAGEMENT

@router.get("/orders")
async def list_orders(
    status:  Optional[str] = Query(None),
    page:    int            = Query(1, ge=1),
    limit:   int            = Query(20),
    db:      AsyncSession   = Depends(get_db),
    _:       User           = Depends(require_admin),
):
    query = select(Order).order_by(desc(Order.created_at))
    if status:
        query = query.where(Order.status == status)

    total  = await db.scalar(select(func.count()).select_from(query.subquery()))
    orders = await db.execute(query.offset((page-1)*limit).limit(limit))
    return {
        "orders": [
            {"id": str(o.id), "status": o.status,
             "price": float(o.price), "buyer_id": str(o.buyer_id),
             "created_at": o.created_at}
            for o in orders.scalars()
        ],
        "total": total,
        "pages": math.ceil((total or 0) / limit),
    }

class OrderAdminUpdateIn(BaseModel):
    status: str

@router.patch("/orders/{order_id}")
async def admin_update_order(
    order_id: str,
    body:     OrderAdminUpdateIn,
    db:       AsyncSession = Depends(get_db),
    _:        User         = Depends(require_admin),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order  = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    order.status = body.status
    await db.commit()
    return {"message": "Order status updated", "status": order.status}

# ── REVIEWS

@router.get("/reviews")
async def list_reviews(
    page:  int          = Query(1, ge=1),
    limit: int          = Query(20),
    db:    AsyncSession = Depends(get_db),
    _:     User         = Depends(require_admin),
):
    query   = select(Review).order_by(desc(Review.created_at))
    total   = await db.scalar(select(func.count()).select_from(query.subquery()))
    reviews = await db.execute(query.offset((page-1)*limit).limit(limit))
    return {
        "reviews": [
            {"id": str(r.id), "rating": r.rating, "comment": r.comment,
             "reviewer_id": str(r.reviewer_id), "gig_id": str(r.gig_id),
             "created_at": r.created_at}
            for r in reviews.scalars()
        ],
        "total": total,
    }

@router.delete("/reviews/{review_id}", status_code=204)
async def delete_review(
    review_id: str,
    db:        AsyncSession = Depends(get_db),
    _:         User         = Depends(require_admin),
):
    result = await db.execute(select(Review).where(Review.id == review_id))
    review = result.scalar_one_or_none()
    if not review:
        raise HTTPException(404, "Review not found")
    await db.delete(review)
    await db.commit()

# ── PAYOUTS

@router.get("/payments")
async def list_payments(
    status:  Optional[str] = Query(None),
    page:    int            = Query(1, ge=1),
    limit:   int            = Query(20),
    db:      AsyncSession   = Depends(get_db),
    _:       User           = Depends(require_admin),
):
    query = select(Payment).order_by(desc(Payment.created_at))
    if status:
        query = query.where(Payment.status == status)

    total    = await db.scalar(select(func.count()).select_from(query.subquery()))
    payments = await db.execute(query.offset((page-1)*limit).limit(limit))
    return {
        "payments": [
            {"id": str(p.id), "amount": float(p.amount),
             "platform_fee": float(p.platform_fee) if p.platform_fee else 0.0,
             "seller_earning": float(p.seller_earning) if p.seller_earning else 0.0,
             "status": p.status, "created_at": p.created_at}
            for p in payments.scalars()
        ],
        "total": total,
    }

@router.post("/payments/{payment_id}/release")
async def release_payment(
    payment_id: str,
    db:         AsyncSession = Depends(get_db),
    _:          User         = Depends(require_admin),
):
    result  = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.status != "HELD":
        raise HTTPException(400, f"Cannot release payment with status: {payment.status}")

    payment.status = "RELEASED"
    
    db.add(AuditLog(
        admin_id=admin.id,
        action="payment.release",
        target_type="payment",
        target_id=payment_id,
        new_value={"order_id": str(payment.order_id)}
    ))
    
    await db.commit()
    return {"message": "Payment released to seller"}

# ════════════════════════════════════════════════════════════════════
# CSV EXPORT ENGINE (STREAMING RESPONSE)
# ════════════════════════════════════════════════════════════════════

from fastapi.responses import StreamingResponse
import csv, io
from datetime import datetime

@router.get("/users/export")
async def export_users_csv(
    search:    Optional[str]  = Query(None),
    role:      Optional[str]  = Query(None),
    is_active: Optional[bool] = Query(None),
    db:        AsyncSession   = Depends(get_db),
    _:         User           = Depends(require_admin),
):
    query = select(User).order_by(desc(User.created_at)).limit(50_000)

    if search:
        query = query.where(User.email.ilike(f"%{search}%") | User.username.ilike(f"%{search}%"))
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)

    result = await db.execute(query)
    rows   = result.scalars().all()

    def generate():
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["ID", "Username", "Email", "Role", "Active", "Verified", "Joined"])
        yield buf.getvalue()
        buf.seek(0); buf.truncate(0)

        for row in rows:
            writer.writerow([
                str(row.id), row.username, row.email, row.role,
                "Yes" if row.is_active   else "No",
                "Yes" if row.is_verified else "No",
                row.created_at.strftime("%Y-%m-%d %H:%M") if row.created_at else "",
            ])
            yield buf.getvalue()
            buf.seek(0); buf.truncate(0)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename  = f"users_export_{timestamp}.csv"

    return StreamingResponse(
        generate(),
        media_type = "text/csv",
        headers    = {
            "Content-Disposition": f'attachment; filename="{filename}"',
            "Cache-Control":       "no-cache",
        },
    )

@router.get("/users/export/full")
async def export_users_full_csv(
    role:   Optional[str]  = Query(None),
    db:     AsyncSession   = Depends(get_db),
    _:      User           = Depends(require_admin),
):
    # Using simple iteration for SQLite/Postgres compatibility without complex subqueries
    query = select(User).order_by(desc(User.created_at)).limit(50_000)
    if role:
        query = query.where(User.role == role)

    result = await db.execute(query)
    users  = result.scalars().all()

    def generate():
        buf = io.StringIO()
        w   = csv.writer(buf)
        w.writerow([
            "ID", "Username", "Email", "Role", "Active", "Verified", "Joined"
        ])
        yield buf.getvalue(); buf.seek(0); buf.truncate(0)

        for row in users:
            w.writerow([
                str(row.id), row.username, row.email, row.role,
                "Yes" if row.is_active else "No",
                "Yes" if row.is_verified else "No",
                row.created_at.strftime("%Y-%m-%d") if row.created_at else "",
            ])
            yield buf.getvalue(); buf.seek(0); buf.truncate(0)

    filename = f"users_full_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    return StreamingResponse(
        generate(),
        media_type = "text/csv",
        headers    = {"Content-Disposition": f'attachment; filename="{filename}"'},
    )

# ════════════════════════════════════════════════════════════════════
# ADVANCED ORDER TRACKING (DISPUTES)
# ════════════════════════════════════════════════════════════════════

class DisputeResolutionIn(BaseModel):
    resolution:   str           # "complete" | "refund"
    admin_note:   Optional[str] = None

@router.post("/orders/{order_id}/resolve")
async def resolve_dispute(
    order_id: str,
    body:     DisputeResolutionIn,
    db:       AsyncSession = Depends(get_db),
    admin:    User         = Depends(require_admin),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order  = result.scalar_one_or_none()
    if not order:
        raise HTTPException(404, "Order not found")
    if order.status != "DISPUTED":
        raise HTTPException(400, "Order is not in disputed status")

    if body.resolution == "complete":
        order.status = "COMPLETED"
        # Release payment from escrow
        payment_result = await db.execute(select(Payment).where(Payment.order_id == order.id))
        payment = payment_result.scalar_one_or_none()
        if payment and payment.status == "HELD":
            payment.status = "RELEASED"

    elif body.resolution == "refund":
        order.status = "CANCELLED"
        # Refund payment
        payment_result = await db.execute(select(Payment).where(Payment.order_id == order.id))
        payment = payment_result.scalar_one_or_none()
        if payment and payment.status in ["HELD", "PENDING"]:
            payment.status = "REFUNDED"

    if body.admin_note:
        order.delivery_note = f"[Admin] {body.admin_note}"

    db.add(AuditLog(
        admin_id=admin.id,
        action="order.resolve_dispute",
        target_type="order",
        target_id=order_id,
        old_value={"status": "DISPUTED"},
        new_value={"status": order.status, "resolution": body.resolution, "admin_note": body.admin_note}
    ))

    await db.commit()
    return {
        "message":    f"Dispute resolved: {body.resolution}",
        "order_id":   order_id,
        "new_status": order.status,
    }

class BulkReleaseIn(BaseModel):
    payment_ids: list[str]

@router.post("/payments/bulk-release")
async def bulk_release_payments(
    body:  BulkReleaseIn,
    db:    AsyncSession = Depends(get_db),
    _:     User         = Depends(require_admin),
):
    released = []
    failed   = []

    for payment_id in body.payment_ids:
        result  = await db.execute(select(Payment).where(Payment.id == payment_id))
        payment = result.scalar_one_or_none()

        if not payment:
            failed.append({"id": payment_id, "reason": "Not found"})
            continue
        if payment.status != "HELD":
            failed.append({"id": payment_id, "reason": f"Status is {payment.status}"})
            continue

        payment.status = "RELEASED"
        released.append(payment_id)
        
        db.add(AuditLog(
            admin_id=admin.id,
            action="payment.bulk_release",
            target_type="payment",
            target_id=payment_id,
            new_value={"order_id": str(payment.order_id)}
        ))

    await db.commit()
    return {
        "released": len(released),
        "failed":   len(failed),
        "details":  failed,
    }

@router.post("/payments/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    db:         AsyncSession = Depends(get_db),
    _:          User         = Depends(require_admin),
):
    result  = await db.execute(select(Payment).where(Payment.id == payment_id))
    payment = result.scalar_one_or_none()
    if not payment:
        raise HTTPException(404, "Payment not found")
    if payment.status not in ("HELD", "PENDING"):
        raise HTTPException(400, f"Cannot refund payment with status: {payment.status}")

    payment.status = "REFUNDED"

    order_result = await db.execute(select(Order).where(Order.id == payment.order_id))
    order = order_result.scalar_one_or_none()
    if order:
        order.status = "CANCELLED"

    db.add(AuditLog(
        admin_id=admin.id,
        action="payment.refund",
        target_type="payment",
        target_id=payment_id,
        new_value={"order_id": str(payment.order_id)}
    ))

    await db.commit()
    return {"message": "Payment refunded", "payment_id": payment_id}

@router.get("/orders/export")
async def export_orders_csv(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db:     AsyncSession  = Depends(get_db),
    _:      User          = Depends(require_admin),
):
    query = select(Order).options(selectinload(Order.buyer), selectinload(Order.seller)).order_by(Order.created_at.desc())
    if status:
        query = query.where(Order.status == status)
    
    result = await db.execute(query)
    rows = result.scalars().all()

    def generate():
        import io, csv
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["Order ID", "Gig ID", "Buyer", "Seller", "Status", "Amount", "Created"])
        yield buf.getvalue()
        buf.seek(0); buf.truncate(0)

        for row in rows:
            writer.writerow([
                str(row.id),
                str(row.gig_id),
                row.buyer.username if row.buyer else "",
                row.seller.username if row.seller else "",
                row.status,
                float(row.amount),
                row.created_at.strftime("%Y-%m-%d %H:%M:%S") if row.created_at else ""
            ])
            yield buf.getvalue()
            buf.seek(0); buf.truncate(0)

    from datetime import datetime
    filename = f"orders_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        generate(),
        media_type = "text/csv",
        headers    = {"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.get("/payments/export")
async def export_payments_csv(
    status: Optional[str] = Query(None),
    db:     AsyncSession  = Depends(get_db),
    _:      User          = Depends(require_admin),
):
    query = select(Payment).order_by(Payment.created_at.desc())
    if status:
        query = query.where(Payment.status == status)
        
    result = await db.execute(query)
    rows = result.scalars().all()

    def generate():
        import io, csv
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(["Payment ID", "Order ID", "Status", "Amount", "Platform Fee", "Seller Earning", "Stripe Intent", "Created"])
        yield buf.getvalue()
        buf.seek(0); buf.truncate(0)

        for row in rows:
            writer.writerow([
                str(row.id),
                str(row.order_id),
                row.status,
                float(row.amount),
                float(row.platform_fee),
                float(row.seller_earning) if row.seller_earning else 0.0,
                row.stripe_payment_intent or "",
                row.created_at.strftime("%Y-%m-%d %H:%M:%S") if row.created_at else ""
            ])
            yield buf.getvalue()
            buf.seek(0); buf.truncate(0)

    from datetime import datetime
    filename = f"payments_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        generate(),
        media_type = "text/csv",
        headers    = {"Content-Disposition": f'attachment; filename="{filename}"'}
    )
