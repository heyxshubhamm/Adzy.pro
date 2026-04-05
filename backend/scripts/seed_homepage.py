import asyncio, sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import AsyncSessionLocal
from app.models.models import HomepageSection
from sqlalchemy import select

SECTIONS = [
    {"id": "hero",            "sort_order": 0, "is_visible": True,  "config": {"name": "Hero Banner"}},
    {"id": "featured_gigs",   "sort_order": 1, "is_visible": True,  "config": {"name": "Featured Gigs"}},
    {"id": "categories",      "sort_order": 2, "is_visible": True,  "config": {"name": "Category Grid"}},
    {"id": "how_it_works",    "sort_order": 3, "is_visible": True,  "config": {"name": "How It Works"}},
    {"id": "why_adzy",        "sort_order": 4, "is_visible": True,  "config": {"name": "Why Choose Adzy"}},
    {"id": "expert_sourcing", "sort_order": 5, "is_visible": True,  "config": {"name": "Expert Sourcing"}},
    {"id": "testimonials",    "sort_order": 6, "is_visible": False, "config": {"name": "Testimonials"}},
    {"id": "join_cta",        "sort_order": 7, "is_visible": True,  "config": {"name": "Join CTA"}},
]

async def seed():
    async with AsyncSessionLocal() as db:
        for s in SECTIONS:
            exists = await db.scalar(
                select(HomepageSection).where(HomepageSection.id == s["id"])
            )
            if not exists:
                db.add(HomepageSection(**s))
        await db.commit()
    print(f"✓ Seeded {len(SECTIONS)} homepage sections.")

if __name__ == "__main__":
    asyncio.run(seed())
