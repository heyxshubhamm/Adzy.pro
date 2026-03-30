"""
Cache-aside helpers.

Never raises on Redis errors — always falls back to the DB callable.
"""
import hashlib
import json
import logging
from typing import Any, Callable, Awaitable

from app.cache.client import cache_redis

log = logging.getLogger(__name__)


class CacheMiss(Exception):
    pass


async def cache_get(key: str) -> Any:
    """Return parsed JSON value or raise CacheMiss."""
    raw = await cache_redis.get(key)
    if raw is None:
        raise CacheMiss(key)
    return json.loads(raw)


async def cache_set(key: str, value: Any, ttl: int) -> None:
    """Serialise value to JSON and store with TTL (seconds)."""
    await cache_redis.setex(key, ttl, json.dumps(value, default=str))


async def cache_delete(key: str) -> None:
    await cache_redis.delete(key)


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern. Returns count deleted."""
    cursor = 0
    deleted = 0
    while True:
        cursor, keys = await cache_redis.scan(cursor, match=pattern, count=100)
        if keys:
            deleted += await cache_redis.delete(*keys)
        if cursor == 0:
            break
    return deleted


async def cached(
    key: str,
    ttl: int,
    fetch: Callable[..., Awaitable[Any]],
    *args: Any,
    **kwargs: Any,
) -> Any:
    """
    Cache-aside: try Redis first, fall back to fetch(), store result.

    Usage:
        result = await cached(
            key   = K.fmt(K.GIG_DETAIL, gig_id=gig_id),
            ttl   = 300,
            fetch = repo.get_by_slug,
            slug,
        )
    """
    try:
        return await cache_get(key)
    except CacheMiss:
        pass
    except Exception as exc:
        log.warning("Redis read error for %s: %s", key, exc)

    value = await fetch(*args, **kwargs)

    if value is not None:
        try:
            await cache_set(key, value, ttl)
        except Exception as exc:
            log.warning("Redis write error for %s: %s", key, exc)

    return value


def make_search_key(params: dict) -> str:
    """Stable cache key from arbitrary search/filter params."""
    stable = json.dumps(params, sort_keys=True)
    digest = hashlib.sha256(stable.encode()).hexdigest()[:16]
    return f"cache:gigs:{digest}"
