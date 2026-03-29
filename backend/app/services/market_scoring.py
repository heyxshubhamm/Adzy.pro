from __future__ import annotations

import hashlib
from datetime import datetime, timedelta, timezone

import redis.asyncio as aioredis
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import Gig, GigStats, Order, User, WeightPolicy
from app.services.score_lib import SellerFeatureVector, normalize_feature_vector, weighted_score_0_100


DEFAULT_WEIGHTS: dict[str, tuple[float, float, float]] = {
    "keywords": (12.0, 5.0, 25.0),
    "total_orders": (8.0, 2.0, 20.0),
    "completed_orders": (12.0, 5.0, 20.0),
    "completion_rate": (6.0, 2.0, 15.0),
    "rejection_penalty": (8.0, 4.0, 20.0),
    "reviews": (20.0, 10.0, 35.0),
    "ctr": (3.0, 1.0, 10.0),
    "online_status": (2.0, 0.0, 8.0),
    "website_activity": (1.0, 0.0, 6.0),
    "repeat_orders": (22.0, 10.0, 35.0),
    "level": (4.0, 0.0, 10.0),
}


redis_client = aioredis.from_url(settings.REDIS_URL)


def stable_ab_bucket(identifier: str) -> int:
    h = hashlib.sha256(identifier.encode("utf-8")).hexdigest()
    return int(h[:8], 16) % 100


async def ensure_default_weights(db: AsyncSession) -> None:
    existing = await db.execute(select(WeightPolicy.weight_name))
    names = {row[0] for row in existing.all()}

    changed = False
    for key, (weight_pct, min_pct, max_pct) in DEFAULT_WEIGHTS.items():
        if key not in names:
            db.add(
                WeightPolicy(
                    weight_name=key,
                    weight_pct=weight_pct,
                    min_pct=min_pct,
                    max_pct=max_pct,
                    updated_by="system",
                )
            )
            changed = True

    if changed:
        await db.commit()


async def load_weights(db: AsyncSession) -> dict[str, float]:
    await ensure_default_weights(db)
    result = await db.execute(select(WeightPolicy))
    rows = result.scalars().all()
    return {row.weight_name: float(row.weight_pct or 0.0) for row in rows}


async def validate_and_update_weights(db: AsyncSession, updates: dict[str, float], updated_by: str) -> dict[str, float]:
    result = await db.execute(select(WeightPolicy))
    policies = {row.weight_name: row for row in result.scalars().all()}

    for key, value in updates.items():
        if key not in policies:
            raise ValueError(f"Unknown weight: {key}")
        policy = policies[key]
        v = float(value)
        if policy.min_pct is not None and v < float(policy.min_pct):
            raise ValueError(f"{key} below min_pct")
        if policy.max_pct is not None and v > float(policy.max_pct):
            raise ValueError(f"{key} above max_pct")
        policy.weight_pct = v
        policy.updated_by = updated_by

    total = sum(float(p.weight_pct or 0.0) for p in policies.values())
    if abs(total - 100.0) > 0.001:
        raise ValueError(f"Weight total must be 100, got {total:.2f}")

    await db.commit()
    return {k: float(v.weight_pct or 0.0) for k, v in policies.items()}


async def _aggregate_seller_features(db: AsyncSession, seller_id: str) -> SellerFeatureVector | None:
    seller_result = await db.execute(select(User).where(User.id == seller_id, User.role == "seller"))
    seller = seller_result.scalar_one_or_none()
    if not seller:
        return None

    gigs_result = await db.execute(select(Gig).where(Gig.seller_id == seller.id, Gig.status != "deleted"))
    gigs = gigs_result.scalars().all()
    if not gigs:
        return SellerFeatureVector(0.0, 0, 0, 0.0, 0.0, 0.0, 0, 0.0, 0.0, 0.0, 0.0, int(seller.publisher_level or 0))

    gig_ids = [g.id for g in gigs]

    orders_completed_q = await db.execute(
        select(func.count(Order.id))
        .where(and_(Order.gig_id.in_(gig_ids), Order.status == "COMPLETED"))
    )
    completed_orders = int(orders_completed_q.scalar() or 0)

    all_orders_q = await db.execute(select(func.count(Order.id)).where(Order.gig_id.in_(gig_ids)))
    total_orders = int(all_orders_q.scalar() or 0)

    rejected_q = await db.execute(
        select(func.count(Order.id))
        .where(and_(Order.gig_id.in_(gig_ids), Order.status.in_(["CANCELLED", "DISPUTED"])))
    )
    rejected_orders = int(rejected_q.scalar() or 0)

    stats_q = await db.execute(select(GigStats).where(GigStats.gig_id.in_(gig_ids)))
    stats_rows = stats_q.scalars().all()
    total_impressions = sum(int(s.impressions_count or 0) for s in stats_rows)
    total_clicks = sum(int(s.clicks_count or 0) for s in stats_rows)

    avg_rating = 0.0
    total_reviews = 0
    website_activity = 0
    keyword_quality = 0.0

    for g in gigs:
        avg_rating += float(g.rating or 0.0)
        total_reviews += int(g.reviews_count or 0)
        website_activity += int(g.views or 0)
        tags_count = len(g.tags or [])
        keyword_quality += min(1.0, tags_count / 5.0)

    avg_rating = avg_rating / max(len(gigs), 1)
    keyword_quality = keyword_quality / max(len(gigs), 1)

    completion_rate = float(seller.completion_rate or 0.0) / 100.0
    rejection_rate = (rejected_orders / total_orders) if total_orders > 0 else 0.0
    ctr = (total_clicks / total_impressions) if total_impressions > 0 else 0.0

    online_status = 0.0
    last_active = seller.last_active_at
    if last_active is not None:
        if last_active.tzinfo is None:
            last_active = last_active.replace(tzinfo=timezone.utc)
        online_status = 1.0 if (datetime.now(timezone.utc) - last_active) <= timedelta(hours=24) else 0.0

    repeat_orders = 0.0
    repeat_q = await db.execute(
        select(Order.buyer_id, func.count(Order.id))
        .where(and_(Order.gig_id.in_(gig_ids), Order.status == "COMPLETED"))
        .group_by(Order.buyer_id)
    )
    buyer_counts = [int(row[1] or 0) for row in repeat_q.all()]
    if completed_orders > 0:
        repeat_completed = sum((c - 1) for c in buyer_counts if c > 1)
        repeat_orders = repeat_completed / completed_orders

    level = int(seller.publisher_level or 0)
    if bool(seller.adzy_choice):
        level = max(level, 4)

    return SellerFeatureVector(
        keywords=keyword_quality,
        total_orders=total_orders,
        completed_orders=completed_orders,
        completion_rate=completion_rate,
        rejection_rate=rejection_rate,
        rating=avg_rating,
        reviews_count=total_reviews,
        ctr=ctr,
        online_status=online_status,
        website_activity=website_activity,
        repeat_orders=repeat_orders,
        level=level,
    )


async def compute_and_store_seller_score(db: AsyncSession, seller_id: str, weights: dict[str, float] | None = None) -> float | None:
    if weights is None:
        weights = await load_weights(db)

    features = await _aggregate_seller_features(db, seller_id)
    if features is None:
        return None

    normalized = normalize_feature_vector(features)
    score = weighted_score_0_100(normalized, weights)

    seller_result = await db.execute(select(User).where(User.id == seller_id, User.role == "seller"))
    seller = seller_result.scalar_one_or_none()
    if not seller:
        return None

    seller.seller_score = score
    await db.commit()

    await redis_client.setex(f"seller_score:{seller_id}", 86400, str(score))
    return score


async def recompute_all_seller_scores(db: AsyncSession) -> dict:
    weights = await load_weights(db)

    sellers_result = await db.execute(select(User.id).where(User.role == "seller"))
    seller_ids = [str(row[0]) for row in sellers_result.all()]

    success = 0
    failed = 0

    for seller_id in seller_ids:
        try:
            score = await compute_and_store_seller_score(db, seller_id, weights=weights)
            if score is not None:
                success += 1
            else:
                failed += 1
        except Exception:
            failed += 1

    return {
        "total": len(seller_ids),
        "success": success,
        "failed": failed,
        "success_rate": round((success / max(1, len(seller_ids))) * 100.0, 2),
    }


async def get_cached_or_db_score(db: AsyncSession, seller_id: str) -> float | None:
    cached = await redis_client.get(f"seller_score:{seller_id}")
    if cached:
        try:
            return float(cached.decode())
        except Exception:
            pass

    seller_result = await db.execute(select(User).where(User.id == seller_id, User.role == "seller"))
    seller = seller_result.scalar_one_or_none()
    if not seller:
        return None

    if seller.seller_score is None:
        return await compute_and_store_seller_score(db, seller_id)

    score = float(seller.seller_score or 0.0)
    await redis_client.setex(f"seller_score:{seller_id}", 3600, str(score))
    return score
