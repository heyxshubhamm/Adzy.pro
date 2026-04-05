import os
import json
import redis.asyncio as aioredis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import SiteConfig, FeatureFlag, AuditLog
from app.db.session import AsyncSessionLocal

REDIS_URL  = os.getenv("REDIS_URL", "redis://localhost:6379/0")
CONFIG_TTL = 60    # 60s cache — changes propagate within 1 minute

# Lazy Redis — only connect once on first use
_redis_client = None

async def _get_redis():
    """Returns a Redis client, or None if Redis is unavailable (dev mode)."""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        client = aioredis.from_url(REDIS_URL, socket_connect_timeout=1)
        await client.ping()
        _redis_client = client
        return client
    except Exception:
        return None

# Keep a module-level alias so other files can `from ... import redis_client`
# They should always call _get_redis() instead, but this avoids ImportError.
redis_client = None

async def _cache_get(key: str):
    r = await _get_redis()
    if not r:
        return None
    try:
        return await r.get(key)
    except Exception:
        return None

async def _cache_set(key: str, value: str, ttl: int = CONFIG_TTL):
    r = await _get_redis()
    if not r:
        return
    try:
        await r.setex(key, ttl, value)
    except Exception:
        pass

async def _cache_delete(key: str):
    r = await _get_redis()
    if not r:
        return
    try:
        await r.delete(key)
    except Exception:
        pass

async def _cache_publish(channel: str, message: str):
    r = await _get_redis()
    if not r:
        return
    try:
        await r.publish(channel, message)
    except Exception:
        pass

# ─── Public API ──────────────────────────────────────────────────────────────

async def get_config(key: str, default=None):
    """Get a config value — Redis first, DB fallback."""
    cached = await _cache_get(f"config:{key}")
    if cached:
        return json.loads(cached)

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(SiteConfig).where(SiteConfig.key == key))
        cfg = result.scalar_one_or_none()
        if not cfg:
            return default
        val = cfg.value
        await _cache_set(f"config:{key}", json.dumps(val))
        return val

async def set_config(key: str, value, admin_id: str, db: AsyncSession):
    """Update a config value and bust Redis cache immediately."""
    result = await db.execute(select(SiteConfig).where(SiteConfig.key == key))
    cfg    = result.scalar_one_or_none()
    old_value = cfg.value if cfg else None

    if cfg:
        cfg.value      = value
        cfg.updated_by = admin_id
    else:
        raise ValueError(f"Config key '{key}' does not exist.")

    db.add(AuditLog(
        admin_id    = admin_id,
        action      = "config.update",
        target_type = "config",
        target_id   = key,
        old_value   = old_value,
        new_value   = value,
    ))
    await db.commit()

    await _cache_delete(f"config:{key}")
    await _cache_delete("config:all_public")
    await _cache_publish("config:changed", json.dumps({"key": key, "value": value}))

async def get_all_public_configs() -> dict:
    """Called by Next.js on page load — returns all public configs."""
    cached = await _cache_get("config:all_public")
    if cached:
        return json.loads(cached)

    async with AsyncSessionLocal() as db:
        result  = await db.execute(select(SiteConfig).where(SiteConfig.is_public == True))
        configs = {c.key: c.value for c in result.scalars().all()}

    await _cache_set("config:all_public", json.dumps(configs))
    return configs

async def is_feature_enabled(key: str, user_id: str = None, role: str = None) -> bool:
    """Check if a feature flag is on for a given user."""
    cached = await _cache_get(f"flag:{key}")
    if cached:
        flag = json.loads(cached)
    else:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(FeatureFlag).where(FeatureFlag.key == key))
            f = result.scalar_one_or_none()
            if not f:
                return False
            flag = {"enabled": f.is_enabled, "pct": f.rollout_pct, "roles": f.allowed_roles or []}
        await _cache_set(f"flag:{key}", json.dumps(flag))

    if not flag.get("enabled"):
        return False
    if flag.get("roles") and role not in flag["roles"]:
        return False
    if flag.get("pct", 100) < 100 and user_id:
        import hashlib
        h = int(hashlib.md5(f"{key}{user_id}".encode()).hexdigest(), 16)
        return (h % 100) < flag["pct"]
    return True
