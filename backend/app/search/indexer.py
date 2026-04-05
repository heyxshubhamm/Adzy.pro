"""
Elasticsearch indexer — sync on publish/update/delete.

Call index_gig() after any gig publish or update.
Call delete_gig_from_index() after a soft-delete.
Run bulk_reindex() as a one-time or periodic Celery task.
"""
from __future__ import annotations

import logging

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Gig, GigPackage
from .es_client import GIG_INDEX, es

log = logging.getLogger(__name__)


async def index_gig(gig_id: str, db: AsyncSession) -> None:
    """Index or re-index a single gig. Call after publish / update."""
    if es is None:
        return

    result = await db.execute(
        select(
            Gig,
            func.min(GigPackage.price).label("price_from"),
            func.min(GigPackage.delivery_days).label("delivery_days_min"),
        )
        .join(GigPackage, GigPackage.gig_id == Gig.id)
        .where(Gig.id == gig_id)
        .group_by(Gig.id)
    )
    row = result.first()
    if not row:
        return

    gig = row[0]
    doc = {
        "id":                str(gig.id),
        "title":             gig.title,
        "slug":              gig.slug,
        "description":       gig.description,
        "tags":              gig.tags or [],
        "status":            gig.status,
        "category_id":       str(gig.category_id) if gig.category_id else None,
        "seller_id":         str(gig.seller_id),
        "avg_rating":        float(gig.rating) if gig.rating else None,
        "review_count":      gig.reviews_count,
        "price_from":        float(row.price_from),
        "delivery_days_min": row.delivery_days_min,
        "created_at":        gig.created_at.isoformat(),
    }

    try:
        await es.index(index=GIG_INDEX, id=str(gig.id), document=doc)
        log.info("Indexed gig %s", gig.id)
    except Exception as exc:
        log.warning("Failed to index gig %s: %s", gig.id, exc)


async def delete_gig_from_index(gig_id: str) -> None:
    if es is None:
        return
    try:
        await es.delete(index=GIG_INDEX, id=gig_id, ignore=[404])
    except Exception as exc:
        log.warning("Failed to delete gig %s from index: %s", gig_id, exc)


async def bulk_reindex(db: AsyncSession, batch_size: int = 100) -> int:
    """Full reindex — run via Celery task or management command."""
    if es is None:
        log.warning("Elasticsearch not available — skipping bulk_reindex")
        return 0

    try:
        from elasticsearch.helpers import async_bulk
    except ImportError:
        log.error("elasticsearch[async] not installed")
        return 0

    offset  = 0
    indexed = 0

    while True:
        result = await db.execute(
            select(
                Gig,
                func.min(GigPackage.price).label("price_from"),
                func.min(GigPackage.delivery_days).label("delivery_days_min"),
            )
            .join(GigPackage, GigPackage.gig_id == Gig.id)
            .where(Gig.status == "active")
            .group_by(Gig.id)
            .offset(offset)
            .limit(batch_size)
        )
        rows = result.all()
        if not rows:
            break

        actions = [
            {
                "_index":  GIG_INDEX,
                "_id":     str(row[0].id),
                "_source": {
                    "id":                str(row[0].id),
                    "title":             row[0].title,
                    "slug":              row[0].slug,
                    "tags":              row[0].tags or [],
                    "status":            row[0].status,
                    "price_from":        float(row.price_from),
                    "delivery_days_min": row.delivery_days_min,
                    "avg_rating":        float(row[0].rating) if row[0].rating else None,
                    "review_count":      row[0].reviews_count,
                    "created_at":        row[0].created_at.isoformat(),
                },
            }
            for row in rows
        ]

        await async_bulk(es, actions)
        indexed += len(rows)
        offset  += batch_size
        log.info("Indexed %d gigs...", indexed)

    return indexed
