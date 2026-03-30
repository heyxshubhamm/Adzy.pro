"""
Distributed lock using Redis SET NX.

Guarantees only one holder across all FastAPI worker processes.
Lock is released via a Lua script (atomic compare-and-delete) so we
never accidentally release another holder's lock if ours expired.
"""
import asyncio
import logging
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from app.cache.client import cache_redis

log = logging.getLogger(__name__)

_LUA_RELEASE = """
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
"""


@asynccontextmanager
async def acquire_lock(
    key: str,
    ttl: int = 30,
    retry_times: int = 3,
    retry_delay: float = 0.1,
) -> AsyncGenerator[None, None]:
    """
    Acquire a distributed lock, yield, then release.

    Usage:
        async with acquire_lock(K.fmt(K.LOCK_ORDER, order_id=order_id)):
            await process_order(order_id)

    Raises TimeoutError if the lock cannot be acquired after *retry_times* attempts.
    """
    token = str(uuid.uuid4())
    acquired = False

    for attempt in range(retry_times):
        ok = await cache_redis.set(key, token, nx=True, ex=ttl)
        if ok:
            acquired = True
            break
        if attempt < retry_times - 1:
            await asyncio.sleep(retry_delay * (2 ** attempt))

    if not acquired:
        raise TimeoutError(f"Could not acquire lock: {key}")

    try:
        yield
    finally:
        released = await cache_redis.eval(_LUA_RELEASE, 1, key, token)
        if not released:
            log.warning("Lock %s expired before release — consider increasing ttl", key)
