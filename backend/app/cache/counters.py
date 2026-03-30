"""
Redis-based view counters with batch flush to Postgres.

Pattern: increment in Redis on every request (cheap), flush to DB
every N minutes via Celery beat (one bulk UPDATE per batch).
"""
import logging

from app.cache.client import cache_redis
from app.cache.keys import K
from app.cache.lock import acquire_lock

log = logging.getLogger(__name__)


async def increment_gig_view(gig_id: str) -> None:
    """
    Increment the in-Redis view counter for a gig.
    Called from a FastAPI BackgroundTask — never blocks the response.
    """
    key = K.fmt(K.GIG_VIEWS, gig_id=gig_id)
    await cache_redis.incr(key)
    # Keep the key alive for at most 2 hours in case Celery is down
    await cache_redis.expire(key, 7200)


async def flush_gig_views_to_db() -> None:
    """
    Scan all view counter keys, apply them to Postgres, then delete the keys.
    Intended to be called by Celery beat every 5 minutes.
    Uses a distributed lock so only one worker flushes at a time.
    """
    from sqlalchemy import update
    from app.db.session import AsyncSessionLocal
    from app.models.models import Gig

    try:
        async with acquire_lock(K.LOCK_GIG_VIEWS, ttl=60):
            cursor = 0
            updates: dict[str, int] = {}

            while True:
                cursor, keys = await cache_redis.scan(
                    cursor, match="counter:gig_views:*", count=200
                )
                for key in keys:
                    count = await cache_redis.getdel(key)
                    if count:
                        gig_id = key.split(":")[-1]
                        updates[gig_id] = int(count)
                if cursor == 0:
                    break

            if not updates:
                return

            async with AsyncSessionLocal() as db:
                for gig_id, count in updates.items():
                    await db.execute(
                        update(Gig)
                        .where(Gig.id == gig_id)
                        .values(views=Gig.views + count)
                    )
                await db.commit()

            log.info("Flushed view counts for %d gigs", len(updates))

    except TimeoutError:
        log.warning("Could not acquire gig-views flush lock — another worker is running")
    except Exception as exc:
        log.error("flush_gig_views_to_db failed: %s", exc)
