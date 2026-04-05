from __future__ import annotations

import hashlib
import os
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.cache.cache_aside import cached, make_search_key
from app.cache.rate_limit import search_limiter
from app.db.session import get_db

from .schemas import SearchParams, SearchResponse

router = APIRouter(tags=["search"])
USE_ELASTIC = os.getenv("USE_ELASTICSEARCH", "false").lower() == "true"


@router.get("/gigs/search", response_model=SearchResponse)
async def search_gigs(
    q:             Optional[str]   = Query(None),
    category:      Optional[str]   = Query(None),
    subcategory:   Optional[str]   = Query(None),
    tags:          Optional[str]   = Query(None),
    min_price:     Optional[float] = Query(None),
    max_price:     Optional[float] = Query(None),
    delivery_days: Optional[int]   = Query(None),
    min_rating:    Optional[float] = Query(None),
    seller_level:  Optional[str]   = Query(None),
    sort:          str             = Query("relevance"),
    page:          int             = Query(1, ge=1),
    limit:         int             = Query(20, ge=1, le=50),
    db:            AsyncSession    = Depends(get_db),
    _:             None            = Depends(search_limiter),
) -> dict:
    params = SearchParams(
        q=q, category=category, subcategory=subcategory, tags=tags,
        min_price=min_price, max_price=max_price,
        delivery_days=delivery_days, min_rating=min_rating,
        seller_level=seller_level, sort=sort, page=page, limit=limit,
    )

    cache_key = make_search_key(params.model_dump())

    async def fetch() -> dict:
        if USE_ELASTIC:
            from .es_search import elasticsearch_search
            return (await elasticsearch_search(params)).model_dump()
        from .postgres_search import postgres_search
        return (await postgres_search(params, db)).model_dump()

    return await cached(key=cache_key, ttl=60, fetch=fetch)


@router.get("/gigs/autocomplete")
async def autocomplete(
    q:  str         = Query(..., min_length=2, max_length=100),
    db: AsyncSession = Depends(get_db),
) -> dict:
    key = f"cache:autocomplete:{hashlib.md5(q.lower().encode()).hexdigest()[:8]}"

    async def fetch() -> list[str]:
        if USE_ELASTIC:
            from .es_client import GIG_INDEX, es
            if es is None:
                return []
            resp    = await es.search(
                index = GIG_INDEX,
                body  = {
                    "suggest": {
                        "title_suggest": {
                            "prefix":     q,
                            "completion": {
                                "field":           "title.autocomplete",
                                "size":            8,
                                "skip_duplicates": True,
                            },
                        }
                    },
                    "size": 0,
                },
            )
            options = resp["suggest"]["title_suggest"][0]["options"]
            return [o["_source"]["title"] for o in options]

        # Postgres trigram prefix match (uses idx_gigs_title_trgm index)
        from sqlalchemy import select
        from app.models.models import Gig
        result = await db.execute(
            select(Gig.title)
            .where(Gig.status == "active", Gig.title.ilike(f"{q}%"))
            .order_by(Gig.reviews_count.desc())
            .limit(8)
        )
        return [row.title for row in result.all()]

    suggestions = await cached(key=key, ttl=300, fetch=fetch)
    return {"suggestions": suggestions}
