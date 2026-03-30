"""
Cache invalidation helpers.

Call these whenever a write changes data that is cached:
  - gig create/update/publish/delete  → invalidate_gig()
  - seller profile update             → invalidate_seller_profile()
  - any gig write                     → invalidate_search_cache()
  - category change                   → invalidate_category_tree()
"""
import logging

from app.cache.cache_aside import cache_delete, cache_delete_pattern
from app.cache.keys import K

log = logging.getLogger(__name__)


async def invalidate_gig(slug: str) -> None:
    """Remove the cached detail response for one gig (keyed by slug)."""
    key = K.fmt(K.GIG_DETAIL, slug=slug)
    await cache_delete(key)
    log.debug("Invalidated gig cache: %s", slug)


async def invalidate_seller_profile(user_id: str) -> None:
    """Remove the cached public seller profile."""
    key = K.fmt(K.SELLER_PROFILE, user_id=user_id)
    await cache_delete(key)


async def invalidate_search_cache() -> None:
    """
    Drop all search-result cache entries.
    Called on any gig mutation that could affect list results.
    Uses SCAN so it never blocks with a single DEL *.
    """
    deleted = await cache_delete_pattern("cache:gigs:*")
    if deleted:
        log.debug("Invalidated %d search cache entries", deleted)


async def invalidate_category_tree() -> None:
    await cache_delete(K.CATEGORY_TREE)
