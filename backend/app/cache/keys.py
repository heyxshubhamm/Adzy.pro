"""
All Redis key templates for the marketplace.
Format: {namespace}:{entity}:{identifier}[:{variant}]

Import the K singleton and call K.fmt(K.GIG_DETAIL, gig_id=...) to get a key.
"""


class _Keys:
    # ── Query cache (db=0) ──────────────────────────────────────────────────
    GIG_DETAIL     = "cache:gig:{slug}"             # full detail response (keyed by slug)
    GIG_LIST       = "cache:gigs:{hash}"            # search/filter result set
    CATEGORY_TREE  = "cache:category:tree"          # all categories
    SELLER_PROFILE = "cache:seller:{user_id}"       # public seller profile

    # ── Auth (db=1) — these mirror token_store.py conventions ──────────────
    REFRESH_TOKEN  = "refresh:{user_id}"            # already used by token_store
    BLACKLIST_JTI  = "blacklist:{jti}"              # already used by token_store
    VERIFY_TOKEN   = "auth:verify:{user_id}"
    VERIFY_COOLDOWN= "auth:verify_cooldown:{user_id}"

    # ── Rate limits (db=2) ──────────────────────────────────────────────────
    RATE_USER      = "rate:user:{user_id}:{endpoint}"
    RATE_IP        = "rate:ip:{ip}:{endpoint}"

    # ── Distributed locks (db=0) ────────────────────────────────────────────
    LOCK_GIG_VIEWS = "lock:gig_views_flush"
    LOCK_ORDER     = "lock:order:{order_id}"

    # ── View counters (db=0, incr-based, flushed to DB by Celery) ───────────
    GIG_VIEWS      = "counter:gig_views:{gig_id}"

    def fmt(self, template: str, **kwargs: str) -> str:
        return template.format(**kwargs)


K = _Keys()
