import asyncio, sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import AsyncSessionLocal
from app.models.models import SiteConfig, FeatureFlag
from sqlalchemy import select

DEFAULT_CONFIGS = [
    # ── Fees ─────────────────────────────────────────────────────
    {"key": "fee.platform_pct",       "value": 20,   "value_type": "number",  "category": "fees",     "label": "Platform commission %",        "is_public": False},
    {"key": "fee.buyer_service",      "value": 5.5,  "value_type": "number",  "category": "fees",     "label": "Buyer service fee %",          "is_public": True},
    {"key": "fee.withdrawal_min",     "value": 20,   "value_type": "number",  "category": "fees",     "label": "Minimum withdrawal ($)",       "is_public": True},
    {"key": "fee.withdrawal_pct",     "value": 2,    "value_type": "number",  "category": "fees",     "label": "Withdrawal fee %",             "is_public": True},

    # ── Limits ───────────────────────────────────────────────────
    {"key": "limit.gigs_per_seller",  "value": 30,   "value_type": "number",  "category": "limits",   "label": "Max gigs per seller",          "is_public": True},
    {"key": "limit.max_gig_price",    "value": 10000,"value_type": "number",  "category": "limits",   "label": "Max gig price ($)",            "is_public": True},
    {"key": "limit.min_gig_price",    "value": 5,    "value_type": "number",  "category": "limits",   "label": "Min gig price ($)",            "is_public": True},
    {"key": "limit.order_revisions",  "value": 3,    "value_type": "number",  "category": "limits",   "label": "Default revision count",       "is_public": True},
    {"key": "limit.dispute_window",   "value": 3,    "value_type": "number",  "category": "limits",   "label": "Dispute window (days)",        "is_public": True},

    # ── Features ─────────────────────────────────────────────────
    {"key": "feature.new_seller_review", "value": True,  "value_type": "bool", "category": "features", "label": "Review new sellers before publish", "is_public": False},
    {"key": "feature.maintenance_mode",  "value": False, "value_type": "bool", "category": "features", "label": "Maintenance mode",               "is_public": True},
    {"key": "feature.registration_open", "value": True,  "value_type": "bool", "category": "features", "label": "Allow new registrations",        "is_public": True},
    {"key": "feature.seller_promotion",  "value": True,  "value_type": "bool", "category": "features", "label": "Promoted gigs enabled",          "is_public": True},

    # ── Content ───────────────────────────────────────────────────
    {"key": "content.hero_title",        "value": "Find the perfect service for your business", "value_type": "string", "category": "content", "label": "Homepage hero title",    "is_public": True},
    {"key": "content.hero_subtitle",     "value": "Trusted by 3M+ businesses worldwide",       "value_type": "string", "category": "content", "label": "Homepage hero subtitle", "is_public": True},
    {"key": "content.announcement_bar",  "value": "",  "value_type": "string", "category": "content",  "label": "Top announcement bar text",     "is_public": True},
    {"key": "content.announcement_on",   "value": False,"value_type": "bool",  "category": "content",  "label": "Show announcement bar",         "is_public": True},

    # ── SEO ───────────────────────────────────────────────────────
    {"key": "seo.site_name",    "value": "Marketplace", "value_type": "string", "category": "seo", "label": "Site name", "is_public": True},
    {"key": "seo.default_desc", "value": "Find freelance services", "value_type": "string", "category": "seo", "label": "Default meta description", "is_public": True},
]

DEFAULT_FLAGS = [
    {"key": "ai_moderation",       "label": "AI gig moderation",        "enabled": True,  "pct": 100},
    {"key": "new_checkout",        "label": "New checkout flow",         "enabled": False, "pct": 0},
    {"key": "seller_analytics_v2", "label": "Seller analytics v2",      "enabled": True,  "pct": 50},
    {"key": "ai_search",           "label": "AI-powered search",        "enabled": False, "pct": 0},
    {"key": "video_gigs",          "label": "Video call gig type",      "enabled": False, "pct": 0},
    {"key": "crypto_payments",     "label": "Crypto payment option",    "enabled": False, "pct": 0},
]

async def seed_configs():
    print("Initializing Platform Configurations & Telemetry...")
    async with AsyncSessionLocal() as db:
        for item in DEFAULT_CONFIGS:
            exists = await db.scalar(select(SiteConfig).where(SiteConfig.key == item["key"]))
            if not exists:
                db.add(SiteConfig(
                    key=item["key"],
                    value=item["value"],
                    value_type=item["value_type"],
                    category=item["category"],
                    label=item["label"],
                    is_public=item["is_public"]
                ))

        for flag in DEFAULT_FLAGS:
            exists = await db.scalar(select(FeatureFlag).where(FeatureFlag.key == flag["key"]))
            if not exists:
                db.add(FeatureFlag(
                    key=flag["key"],
                    label=flag["label"],
                    is_enabled=flag["enabled"],
                    rollout_pct=flag["pct"],
                    allowed_roles=[],
                    allowed_envs=["production", "staging"]
                ))
        await db.commit()
        print("✓ Layer 1 Configurations perfectly seeded.")

if __name__ == "__main__":
    asyncio.run(seed_configs())
