"""
Sliding-window rate limiter using Redis sorted sets.

Usage (FastAPI dependency):

    @router.post("/auth/login")
    async def login(
        _: None = Depends(login_limiter),
        body: LoginIn = ...,
    ):
        ...
"""
import time
import logging
from fastapi import Request, HTTPException

from app.cache.client import rate_redis
from app.cache.keys import K

log = logging.getLogger(__name__)


class RateLimitExceeded(HTTPException):
    def __init__(self, retry_after: int) -> None:
        super().__init__(
            status_code=429,
            detail=f"Rate limit exceeded. Retry after {retry_after}s.",
            headers={"Retry-After": str(retry_after)},
        )


async def _sliding_window(key: str, limit: int, window: int) -> int:
    """
    Increment a sliding-window counter for *key*.
    Returns the current request count within the window.
    Raises RateLimitExceeded when the count exceeds *limit*.
    """
    now = time.time()
    window_start = now - window

    pipe = rate_redis.pipeline()
    pipe.zremrangebyscore(key, 0, window_start)   # drop expired entries
    pipe.zadd(key, {str(now): now})               # record this request
    pipe.zcard(key)                               # count in-window requests
    pipe.expire(key, window)                      # reset TTL
    results = await pipe.execute()

    count = results[2]
    if count > limit:
        raise RateLimitExceeded(retry_after=window)
    return count


def rate_limit(
    limit: int,
    window: int = 60,
    scope: str = "ip",        # "user" | "ip" | "both"
    endpoint: str = "",
):
    """
    FastAPI dependency factory.

    scope="user"  — limit by authenticated user_id (falls back to IP if anonymous)
    scope="ip"    — limit by client IP
    scope="both"  — enforce both budgets independently (IP gets 2× budget)
    """
    async def dependency(request: Request) -> None:
        ep = endpoint or request.url.path

        try:
            if scope in ("user", "both"):
                user_id = getattr(request.state, "user_id", None)
                if user_id:
                    key = K.fmt(K.RATE_USER, user_id=str(user_id), endpoint=ep)
                    remaining = limit - await _sliding_window(key, limit, window)
                    request.state.rate_limit_remaining = max(0, remaining)

            if scope in ("ip", "both"):
                ip = (request.client.host if request.client else "unknown")
                key = K.fmt(K.RATE_IP, ip=ip, endpoint=ep)
                ip_limit = limit * 2 if scope == "both" else limit
                await _sliding_window(key, ip_limit, window)

        except RateLimitExceeded:
            raise
        except Exception as exc:
            # Never block a request because Redis is down
            log.warning("Rate-limit Redis error (%s): %s", ep, exc)

    return dependency


# ── Pre-built limiters ────────────────────────────────────────────────────────

login_limiter    = rate_limit(limit=10,  window=300,  scope="ip",   endpoint="login")
register_limiter = rate_limit(limit=5,   window=3600, scope="ip",   endpoint="register")
order_limiter    = rate_limit(limit=10,  window=60,   scope="user", endpoint="order")
message_limiter  = rate_limit(limit=30,  window=60,   scope="user", endpoint="message")
search_limiter   = rate_limit(limit=60,  window=60,   scope="both", endpoint="search")
presign_limiter  = rate_limit(limit=20,  window=60,   scope="user", endpoint="presign")
