from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Gig, GigStats, Order, User


def _level_label(level: int, adzy_choice: bool) -> str:
    if adzy_choice or level >= 4:
        return "adzy_choice"
    if level >= 3:
        return "best_seller"
    if level == 2:
        return "level_2"
    if level == 1:
        return "level_1"
    return "new"


async def recompute_seller_levels(db: AsyncSession) -> dict:
    sellers_result = await db.execute(select(User).where(User.role == "seller"))
    sellers = sellers_result.scalars().all()
    if not sellers:
        return {"updated": 0, "adzy_choice": 0, "best_seller": 0}

    orders_result = await db.execute(
        select(Gig.seller_id, func.count(Order.id))
        .join(Order, Order.gig_id == Gig.id)
        .where(Order.status == "COMPLETED")
        .group_by(Gig.seller_id)
    )
    completed_by_seller = {str(row[0]): int(row[1] or 0) for row in orders_result.all()}

    rating_result = await db.execute(
        select(Gig.seller_id, func.avg(Gig.rating))
        .where(Gig.status != "deleted")
        .group_by(Gig.seller_id)
    )
    avg_rating_by_seller = {str(row[0]): float(row[1] or 0) for row in rating_result.all()}

    order_counts = sorted(completed_by_seller.values())
    q80 = order_counts[max(0, int(len(order_counts) * 0.80) - 1)] if order_counts else 0
    q95 = order_counts[max(0, int(len(order_counts) * 0.95) - 1)] if order_counts else 0

    updated = 0
    adzy_choice = 0
    best_seller = 0

    for seller in sellers:
        sid = str(seller.id)
        completed = completed_by_seller.get(sid, 0)
        avg_rating = avg_rating_by_seller.get(sid, 0.0)
        completion_rate = float(seller.completion_rate or 0.0)

        new_level = 0
        new_adzy_choice = False

        if completed >= max(100, q95) and avg_rating >= 4.8 and completion_rate >= 97:
            new_level = 4
            new_adzy_choice = True
        elif completed >= max(50, q80) and avg_rating >= 4.6 and completion_rate >= 95:
            new_level = 3
        elif completed >= 15 and avg_rating >= 4.3 and completion_rate >= 90:
            new_level = 2
        elif completed >= 5 and avg_rating >= 4.0 and completion_rate >= 85:
            new_level = 1

        changed = (seller.publisher_level != new_level) or (bool(seller.adzy_choice) != new_adzy_choice)
        if changed:
            updated += 1
            seller.publisher_level = new_level
            seller.adzy_choice = new_adzy_choice
            seller.last_level_eval = datetime.now(timezone.utc)

        if new_adzy_choice:
            adzy_choice += 1
        elif new_level >= 3:
            best_seller += 1

    await db.commit()
    return {
        "updated": updated,
        "adzy_choice": adzy_choice,
        "best_seller": best_seller,
        "q80_completed_orders": q80,
        "q95_completed_orders": q95,
    }


async def recompute_gig_levels(db: AsyncSession) -> dict:
    now = datetime.now(timezone.utc)
    last_7d = now - timedelta(days=7)
    last_24h = now - timedelta(hours=24)

    gigs_result = await db.execute(
        select(Gig)
        .where(Gig.status != "deleted")
        .join(User, User.id == Gig.seller_id)
    )
    gigs = gigs_result.scalars().all()

    orders_7d_result = await db.execute(
        select(Order.gig_id, func.count(Order.id))
        .where(and_(Order.status == "COMPLETED", Order.created_at >= last_7d))
        .group_by(Order.gig_id)
    )
    orders_7d = {str(row[0]): int(row[1] or 0) for row in orders_7d_result.all()}

    orders_24h_result = await db.execute(
        select(Order.gig_id, func.count(Order.id))
        .where(and_(Order.status == "COMPLETED", Order.created_at >= last_24h))
        .group_by(Order.gig_id)
    )
    orders_24h = {str(row[0]): int(row[1] or 0) for row in orders_24h_result.all()}

    stats_result = await db.execute(select(GigStats).where(GigStats.gig_id.in_([g.id for g in gigs])))
    stats_by_gig = {str(s.gig_id): s for s in stats_result.scalars().all()}

    updated = 0
    counts = {"hot": 0, "recommended": 0, "trending": 0, "standard": 0}

    for gig in gigs:
        gid = str(gig.id)
        o7 = orders_7d.get(gid, 0)
        o24 = orders_24h.get(gid, 0)
        stats = stats_by_gig.get(gid)
        impressions = int(getattr(stats, "impressions_count", 0) or 0)
        clicks = int(getattr(stats, "clicks_count", 0) or 0)

        ctr = (clicks / impressions) if impressions > 0 else 0.0
        conversion = (o7 / clicks) if clicks > 0 else 0.0
        rating = float(gig.rating or 0.0)

        seller_level = int(getattr(gig.seller, "publisher_level", 0) or 0)
        seller_adzy = bool(getattr(gig.seller, "adzy_choice", False))

        new_gig_level = "standard"
        age_days = (now.date() - gig.created_at.date()).days

        if o7 >= 5 and rating >= 4.5 and conversion >= 0.05:
            new_gig_level = "hot"
        if (seller_level >= 3 or seller_adzy) and rating >= 4.6 and conversion >= 0.04:
            new_gig_level = "recommended"
        if age_days <= 30 and o24 >= 2 and o7 > 0 and (o24 / o7) >= 0.35:
            new_gig_level = "trending"

        changed = (
            gig.gig_level != new_gig_level
            or int(gig.orders_last_7d or 0) != o7
            or float(gig.ctr_7d or 0) != round(ctr, 4)
            or float(gig.conversion_7d or 0) != round(conversion, 4)
        )

        gig.orders_last_7d = o7
        gig.ctr_7d = round(ctr, 4)
        gig.conversion_7d = round(conversion, 4)
        gig.gig_level = new_gig_level

        if changed:
            updated += 1
        counts[new_gig_level] += 1

    await db.commit()
    return {"updated": updated, **counts}


async def recompute_market_levels(db: AsyncSession) -> dict:
    seller = await recompute_seller_levels(db)
    gigs = await recompute_gig_levels(db)
    return {"seller": seller, "gigs": gigs}
