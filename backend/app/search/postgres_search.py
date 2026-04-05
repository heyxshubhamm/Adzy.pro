from __future__ import annotations

import time
from typing import Optional

from sqlalchemy import func, literal, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import (
    Category,
    Gig,
    GigMedia,
    GigPackage,
    SellerProfile,
    User,
)
from app.services.ai_client import get_embedding_with_failover

from .schemas import GigSearchResult, SearchParams, SearchResponse


# Standalone column reference for the generated tsvector — used in @@ and ts_rank_cd
# (literal_column lets us reference a DB column not mapped on the Python model)
from sqlalchemy import literal_column

_search_vec = literal_column("gigs.search_vector")


async def postgres_search(
    params: SearchParams,
    db: AsyncSession,
) -> SearchResponse:
    start = time.monotonic()

    # ── Per-gig aggregates subquery ───────────────────────────────
    pkg_sub = (
        select(
            GigPackage.gig_id,
            func.min(GigPackage.price).label("price_from"),
            func.min(GigPackage.delivery_days).label("delivery_days_min"),
        )
        .group_by(GigPackage.gig_id)
        .subquery()
    )

    # ── Cover image subquery ──────────────────────────────────────
    cover_sub = (
        select(GigMedia.gig_id, GigMedia.url.label("cover_url"))
        .where(GigMedia.is_cover.is_(True))
        .distinct(GigMedia.gig_id)
        .subquery()
    )

    # ── Main query ────────────────────────────────────────────────
    query = (
        select(
            Gig.id,
            Gig.title,
            Gig.slug,
            Gig.tags,
            Gig.rating.label("avg_rating"),
            Gig.reviews_count.label("review_count"),
            User.username.label("seller_name"),
            pkg_sub.c.price_from,
            pkg_sub.c.delivery_days_min,
            cover_sub.c.cover_url,
        )
        .join(User,       User.id       == Gig.seller_id)
        .join(pkg_sub,    pkg_sub.c.gig_id == Gig.id)
        .outerjoin(cover_sub, cover_sub.c.gig_id == Gig.id)
        .where(Gig.status == "active")
    )

    # ── FTS rank column (0 when no query) + Semantic Search ──
    rank_col = literal(0).label("rank")

    if params.q:
        # Generate semantic embedding for user query
        query_embedding = await get_embedding_with_failover(params.q)
        
        tsquery    = func.plainto_tsquery("english", params.q)
        ws_query   = func.websearch_to_tsquery("english", params.q)

        fts_cond = or_(
            _search_vec.op("@@")(tsquery),
            _search_vec.op("@@")(ws_query),
            Gig.title.ilike(f"%{params.q}%"),
        )
        query = query.where(fts_cond)
        
        # Hybrid Scoring: FTS Rank + Semantic Distance Margin
        fts_rank = func.ts_rank_cd(_search_vec, tsquery, 32)
        if query_embedding:
            # pgvector distance: <-> (L2), <=> (Cosine), <#> (Inner Product)
            # We want similarity, so 1 - cosine_distance
            semantic_sim = 1.0 - Gig.embedding.cosine_distance(query_embedding)
            # Combine FTS rank with Semantic Similarity
            rank_col = (fts_rank + (semantic_sim * 2.0)).label("rank")
        else:
            rank_col = fts_rank.label("rank")
            
    query = query.add_columns(rank_col)

    # ── Category / subcategory filter ─────────────────────────────
    if params.category:
        cat_result = await db.execute(
            select(Category.id, Category.parent_id)
            .where(Category.slug == params.category)
        )
        cat_row = cat_result.first()
        if cat_row:
            if params.subcategory:
                sub_result = await db.execute(
                    select(Category.id).where(
                        Category.slug == params.subcategory,
                        Category.parent_id == cat_row.id,
                    )
                )
                sub_id = sub_result.scalar_one_or_none()
                if sub_id:
                    query = query.where(Gig.category_id == sub_id)
            else:
                sub_ids_result = await db.execute(
                    select(Category.id).where(Category.parent_id == cat_row.id)
                )
                sub_ids = [r[0] for r in sub_ids_result.all()]
                query   = query.where(
                    Gig.category_id.in_([cat_row.id, *sub_ids])
                )

    # ── Tag filter (AND semantics — every tag must match) ─────────
    for tag in params.tag_list:
        query = query.where(Gig.tags.contains([tag]))

    # ── Price / delivery / rating / seller-level filters ─────────
    if params.min_price is not None:
        query = query.where(pkg_sub.c.price_from >= params.min_price)
    if params.max_price is not None:
        query = query.where(pkg_sub.c.price_from <= params.max_price)
    if params.delivery_days:
        query = query.where(pkg_sub.c.delivery_days_min <= params.delivery_days)
    if params.min_rating is not None:
        query = query.where(Gig.rating >= params.min_rating)
    if params.seller_level:
        query = (
            query
            .join(SellerProfile, SellerProfile.user_id == Gig.seller_id)
            .where(SellerProfile.seller_level == params.seller_level)
        )

    # ── Count before pagination ───────────────────────────────────
    count_result = await db.execute(
        select(func.count()).select_from(query.subquery())
    )
    total = count_result.scalar_one()

    # ── Sort ──────────────────────────────────────────────────────
    sort_map = {
        "relevance":  [rank_col.desc(), Gig.rating.desc().nullslast()],
        "price_asc":  [pkg_sub.c.price_from.asc()],
        "price_desc": [pkg_sub.c.price_from.desc()],
        "rating":     [Gig.rating.desc().nullslast(), Gig.reviews_count.desc()],
        "newest":     [Gig.created_at.desc()],
        "popular":    [Gig.reviews_count.desc(), Gig.rating.desc().nullslast()],
    }
    for col in sort_map.get(params.sort, sort_map["relevance"]):
        query = query.order_by(col)

    query = query.offset(params.offset).limit(params.limit)
    rows  = (await db.execute(query)).all()

    # ── Facets + suggestions ──────────────────────────────────────
    facets      = await _compute_facets(db)
    suggestions = []
    if total == 0 and params.q:
        suggestions = await _get_suggestions(params.q, db)

    results = [
        GigSearchResult(
            id                = row.id,
            title             = row.title,
            slug              = row.slug,
            cover_url         = row.cover_url,
            seller_name       = row.seller_name,
            seller_level      = None,
            price_from        = row.price_from,
            delivery_days_min = row.delivery_days_min,
            avg_rating        = float(row.avg_rating) if row.avg_rating else None,
            review_count      = row.review_count,
            tags              = row.tags or [],
            rank              = float(row.rank) if row.rank else None,
        )
        for row in rows
    ]

    return SearchResponse(
        results     = results,
        total       = total,
        page        = params.page,
        pages       = -(-total // params.limit),
        query       = params.q,
        facets      = facets,
        suggestions = suggestions,
        took_ms     = round((time.monotonic() - start) * 1000, 1),
    )


async def _compute_facets(db: AsyncSession) -> dict:
    result = await db.execute(
        select(
            Category.name,
            Category.slug,
            func.count(Gig.id).label("count"),
        )
        .join(Gig, Gig.category_id == Category.id)
        .where(Gig.status == "active", Category.parent_id.is_(None))
        .group_by(Category.id)
        .order_by(func.count(Gig.id).desc())
    )
    return {
        "categories": [
            {"name": r.name, "slug": r.slug, "count": r.count}
            for r in result.all()
        ]
    }


async def _get_suggestions(q: str, db: AsyncSession) -> list[str]:
    """Trigram similarity — 'did you mean' fallback on zero results."""
    result = await db.execute(
        select(Gig.title)
        .where(
            Gig.status == "active",
            func.similarity(Gig.title, q) > 0.1,
        )
        .order_by(func.similarity(Gig.title, q).desc())
        .limit(3)
    )
    return [row.title for row in result.all()]
