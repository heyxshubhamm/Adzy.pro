import redis.asyncio as aioredis
import os
from .tokens import hash_token, REFRESH_EXPIRE

# Layer 2: Persistence Sync (Redis)
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client = aioredis.from_url(redis_url)

REFRESH_TTL = int(REFRESH_EXPIRE.total_seconds())

async def save_refresh_token(user_id: str, token: str) -> None:
    """Stores a hashed refresh token in Redis to enable session persistence."""
    key = f"refresh:{user_id}"
    await redis_client.setex(key, REFRESH_TTL, hash_token(token))

async def validate_refresh_token(user_id: str, token: str) -> bool:
    """Verifies that the provided refresh token matches the hashed authority in Redis."""
    key    = f"refresh:{user_id}"
    stored = await redis_client.get(key)
    if not stored:
        return False
    return stored.decode() == hash_token(token)

async def revoke_refresh_token(user_id: str) -> None:
    """Invalidates the refresh token, forcing a full identification loop."""
    await redis_client.delete(f"refresh:{user_id}")

async def blacklist_access_token(jti: str, ttl_seconds: int) -> None:
    """Blacklists a specific JWT identifier to prevent reuse after logout."""
    await redis_client.setex(f"blacklist:{jti}", ttl_seconds, "1")

async def is_access_token_blacklisted(jti: str) -> bool:
    """Checks if the JWT has been revoked in the last 15 minutes."""
    return bool(await redis_client.exists(f"blacklist:{jti}"))
