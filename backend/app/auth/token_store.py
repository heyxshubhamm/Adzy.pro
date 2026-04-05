import logging
import os

import redis.asyncio as aioredis
from fastapi import HTTPException

from .tokens import REFRESH_EXPIRE, hash_token

log = logging.getLogger(__name__)

redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = aioredis.from_url(redis_url, socket_connect_timeout=2)

REFRESH_TTL = int(REFRESH_EXPIRE.total_seconds())


def _redis_unavailable() -> HTTPException:
    return HTTPException(
        status_code=503,
        detail="Auth service temporarily unavailable — session store is down. Please try again shortly.",
    )


async def save_refresh_token(user_id: str, token: str) -> None:
    key = f"refresh:{user_id}"
    try:
        await redis_client.setex(key, REFRESH_TTL, hash_token(token))
    except Exception as exc:
        log.error("Redis unavailable — cannot persist refresh token for user %s: %s", user_id, exc)
        raise _redis_unavailable()


async def validate_refresh_token(user_id: str, token: str) -> bool:
    key = f"refresh:{user_id}"
    try:
        stored = await redis_client.get(key)
    except Exception as exc:
        log.error("Redis unavailable — cannot validate refresh token: %s", exc)
        return False
    if not stored:
        return False
    return stored.decode() == hash_token(token)


async def revoke_refresh_token(user_id: str) -> None:
    try:
        await redis_client.delete(f"refresh:{user_id}")
    except Exception as exc:
        log.warning("Redis unavailable — cannot revoke refresh token for user %s: %s", user_id, exc)


async def blacklist_access_token(jti: str, ttl_seconds: int) -> None:
    try:
        await redis_client.setex(f"blacklist:{jti}", ttl_seconds, "1")
    except Exception as exc:
        log.warning("Redis unavailable — cannot blacklist token %s: %s", jti, exc)


async def is_access_token_blacklisted(jti: str) -> bool:
    try:
        return bool(await redis_client.exists(f"blacklist:{jti}"))
    except Exception as exc:
        log.warning("Redis unavailable — assuming token %s is not blacklisted: %s", jti, exc)
        return False
