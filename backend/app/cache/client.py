"""
Redis connection pool — one pool per logical database.

Roles and databases:
  cache  (db=0) — query results, search, categories
  auth   (db=1) — tokens, sessions (shared with token_store)
  rate   (db=2) — rate limit sliding-window counters
"""
import logging
import os

import redis.asyncio as aioredis
from redis.asyncio.connection import ConnectionPool
from redis.backoff import ExponentialBackoff
from redis.retry import Retry

log = logging.getLogger(__name__)

_REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
_MAX_CONN  = int(os.getenv("REDIS_MAX_CONNECTIONS", 20))
_SOCK_TIMEOUT = float(os.getenv("REDIS_SOCKET_TIMEOUT", 5))


def _build_pool(db: int = 0) -> ConnectionPool:
    return ConnectionPool.from_url(
        _REDIS_URL,
        db=db,
        max_connections=_MAX_CONN,
        socket_timeout=_SOCK_TIMEOUT,
        socket_connect_timeout=2,
        retry_on_timeout=True,
        retry=Retry(ExponentialBackoff(cap=0.5, base=0.1), retries=3),
        decode_responses=True,
        health_check_interval=30,
    )


_pools: dict[str, ConnectionPool] = {
    "cache": _build_pool(db=0),
    "auth":  _build_pool(db=1),
    "rate":  _build_pool(db=2),
}


def get_redis(role: str = "cache") -> aioredis.Redis:
    return aioredis.Redis(connection_pool=_pools[role])


# Convenience singletons — import these directly where needed
cache_redis = get_redis("cache")
rate_redis  = get_redis("rate")


async def check_redis_health() -> bool:
    try:
        await cache_redis.ping()
        return True
    except Exception as exc:
        log.error("Redis health check failed: %s", exc)
        return False


async def close_redis_pools() -> None:
    for pool in _pools.values():
        await pool.aclose()
