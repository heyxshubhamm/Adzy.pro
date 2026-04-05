"""
Dev data seeder — run inside the backend container:
    docker compose exec backend python scripts/seed_dev_data.py

Creates:
    - 2 seller accounts + seller profiles
    - 1 buyer account
    - 4 categories
    - 6 gigs with packages, requirements, and placeholder media
    - 2 reviews
"""
from __future__ import annotations

import asyncio
import sys
import uuid
from pathlib import Path

# Make sure app package is importable when run from /app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.models import (
    Category,
    Gig,
    GigMedia,
    GigPackage,
    GigRequirement,
    GigStats,
    Review,
    SellerProfile,
    User,
)

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _hash(pw: str) -> str:
    return pwd_ctx.hash(pw)


def _slug(title: str) -> str:
    import re
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")


async def _exists(db: AsyncSession, model, **kwargs) -> bool:
    filters = [getattr(model, k) == v for k, v in kwargs.items()]
    result = await db.execute(select(model).where(*filters))
    return result.scalar_one_or_none() is not None


# ── Seed functions ────────────────────────────────────────────────────────────

async def seed_categories(db: AsyncSession) -> dict[str, Category]:
    cats: dict[str, Category] = {}
    definitions = [
        ("Digital Marketing", "digital-marketing"),
        ("Graphic Design",    "graphic-design"),
        ("Writing & Copy",    "writing-copy"),
        ("Programming",       "programming"),
    ]
    for name, slug in definitions:
        if not await _exists(db, Category, slug=slug):
            c = Category(id=uuid.uuid4(), name=name, slug=slug)
            db.add(c)
            cats[slug] = c
        else:
            result = await db.execute(select(Category).where(Category.slug == slug))
            cats[slug] = result.scalar_one()

    await db.flush()
    return cats


async def seed_users(db: AsyncSession) -> tuple[User, User, User]:
    sellers_data = [
        dict(
            username="alice_design",
            email="alice@adzy.dev",
            role="seller",
            display_name="Alice Chen",
            bio="UI/UX designer with 8 years crafting digital products. I turn complex problems into clean, intuitive interfaces.",
            skills=["Figma", "Adobe XD", "UI Design", "Brand Identity"],
            country="Singapore",
        ),
        dict(
            username="bob_dev",
            email="bob@adzy.dev",
            role="seller",
            display_name="Bob Martinez",
            bio="Full-stack developer specialising in Next.js, FastAPI, and cloud architecture. Ship fast, iterate faster.",
            skills=["Next.js", "Python", "FastAPI", "PostgreSQL", "AWS"],
            country="Spain",
        ),
    ]

    users: list[User] = []
    for d in sellers_data:
        if not await _exists(db, User, email=d["email"]):
            u = User(
                id=uuid.uuid4(),
                username=d["username"],
                email=d["email"],
                hashed_password=_hash("Dev@12345"),
                role=d["role"],
                is_active=True,
                is_verified=True,
                publisher_level=2,
                total_orders_completed=24,
                completion_rate=98.5,
                on_time_delivery_rate=97.0,
                response_speed_seconds=1800,
            )
            db.add(u)
            await db.flush()

            sp = SellerProfile(
                id=uuid.uuid4(),
                user_id=u.id,
                display_name=d["display_name"],
                bio=d["bio"],
                skills=d["skills"],
                languages=["English"],
                country=d["country"],
                seller_level="level_2",
                response_time=30,
                completed_orders=24,
                is_available=True,
            )
            db.add(sp)
            users.append(u)
        else:
            result = await db.execute(select(User).where(User.email == d["email"]))
            users.append(result.scalar_one())

    # Buyer
    buyer: User
    if not await _exists(db, User, email="buyer@adzy.dev"):
        buyer = User(
            id=uuid.uuid4(),
            username="demo_buyer",
            email="buyer@adzy.dev",
            hashed_password=_hash("Dev@12345"),
            role="buyer",
            is_active=True,
            is_verified=True,
        )
        db.add(buyer)
    else:
        result = await db.execute(select(User).where(User.email == "buyer@adzy.dev"))
        buyer = result.scalar_one()

    await db.flush()
    return users[0], users[1], buyer


async def seed_gigs(
    db: AsyncSession,
    seller1: User,
    seller2: User,
    categories: dict[str, Category],
) -> list[Gig]:
    gig_defs = [
        # ── Alice's gigs ──────────────────────────────────────────────────────
        dict(
            title="I will design a stunning logo and brand identity",
            description=(
                "Professional logo design with full brand identity kit. "
                "Deliverables include vector files, colour palette, typography guide, "
                "and social media kit. Every design starts with a discovery questionnaire "
                "so I understand your brand personality before opening Figma."
            ),
            category="graphic-design",
            tags=["logo design", "brand identity", "figma", "vector"],
            seller=seller1,
            packages=[
                dict(tier="basic",    name="Basic Logo",    description="1 logo concept, 2 revisions, PNG/JPG",         price=49,  days=3,  revisions=2),
                dict(tier="standard", name="Brand Starter", description="2 concepts, vector files, social media kit",   price=129, days=5,  revisions=5),
                dict(tier="premium",  name="Full Identity",  description="3 concepts + full brand guide PDF + stationery", price=299, days=10, revisions=10),
            ],
            requirements=["What is your company name and tagline?", "Describe your target audience in 1-2 sentences.", "Upload any reference logos you like (optional)."],
        ),
        dict(
            title="I will create a professional UI/UX design for your app",
            description=(
                "From wireframes to pixel-perfect Figma prototypes. "
                "I specialise in SaaS dashboards, mobile apps, and e-commerce. "
                "All deliverables include interactive prototype, design system, "
                "and developer handoff notes."
            ),
            category="graphic-design",
            tags=["ui design", "ux design", "figma", "prototype", "saas"],
            seller=seller1,
            packages=[
                dict(tier="basic",    name="Wireframes",    description="Up to 5 screens, low-fidelity",              price=89,  days=4,  revisions=2),
                dict(tier="standard", name="UI Design",     description="Up to 10 hi-fi screens + style guide",       price=249, days=7,  revisions=5),
                dict(tier="premium",  name="Full UX",       description="Up to 20 screens + prototype + user flows",  price=499, days=14, revisions=10),
            ],
            requirements=["What platform is this for (web, iOS, Android, or all)?", "Do you have existing branding? Upload style guide if yes.", "List the key screens you need designed."],
        ),
        dict(
            title="I will design social media graphics for your brand",
            description=(
                "Eye-catching social posts, story templates, and ad creatives "
                "optimised for Instagram, LinkedIn, and Twitter/X. "
                "Delivered as editable Canva or Figma templates so your team "
                "can update content without a designer."
            ),
            category="graphic-design",
            tags=["social media", "instagram", "canva", "graphics"],
            seller=seller1,
            packages=[
                dict(tier="basic",    name="5 Posts",    description="5 static post designs",                   price=29,  days=2, revisions=2),
                dict(tier="standard", name="10 Posts",   description="10 posts + 5 story templates",            price=69,  days=4, revisions=3),
                dict(tier="premium",  name="Brand Pack", description="20 posts + stories + ad creatives + editable templates", price=149, days=7, revisions=5),
            ],
            requirements=["Which platforms do you post on?", "Upload your logo and brand colours (hex codes are fine)."],
        ),

        # ── Bob's gigs ────────────────────────────────────────────────────────
        dict(
            title="I will build a Next.js website with FastAPI backend",
            description=(
                "Full-stack web application built with Next.js 14 App Router and "
                "FastAPI (Python). Includes authentication (JWT + OAuth), PostgreSQL "
                "database with Alembic migrations, Redis caching, and deployment "
                "config for Railway or Vercel + Render."
            ),
            category="programming",
            tags=["next.js", "fastapi", "python", "postgresql", "full-stack"],
            seller=seller2,
            packages=[
                dict(tier="basic",    name="Landing Page",   description="Static Next.js landing page, no backend",               price=149, days=5,  revisions=2),
                dict(tier="standard", name="Web App",        description="Full-stack app with auth + 3 CRUD features",            price=499, days=14, revisions=3),
                dict(tier="premium",  name="Production App", description="Full-stack + payments + email + CI/CD + deployment",    price=999, days=21, revisions=5),
            ],
            requirements=["Describe the core features you need (be specific).", "Do you have a design mockup or existing UI?", "What is your preferred deployment platform?"],
        ),
        dict(
            title="I will set up your CI/CD pipeline with GitHub Actions",
            description=(
                "Automated test, build, and deploy pipelines for your project. "
                "Supports Node.js, Python, and Docker workloads. "
                "Deploy targets: Vercel, Railway, AWS ECS, or a bare VPS. "
                "Includes branch protection rules, code quality checks, and "
                "Slack/Discord notifications."
            ),
            category="programming",
            tags=["github actions", "ci/cd", "devops", "docker", "automation"],
            seller=seller2,
            packages=[
                dict(tier="basic",    name="Basic Pipeline",  description="Lint + test + deploy to one target",             price=79,  days=2, revisions=2),
                dict(tier="standard", name="Full CI/CD",      description="Multi-stage pipeline, staging + prod envs",      price=199, days=5, revisions=3),
                dict(tier="premium",  name="DevOps Setup",    description="Pipeline + Docker + monitoring + runbook",       price=399, days=10, revisions=5),
            ],
            requirements=["What language/framework is your project?", "Where do you deploy (Vercel, Railway, AWS, VPS)?", "Link to your GitHub repo (can be private, I'll request access)."],
        ),
        dict(
            title="I will write SEO-optimised blog content for your tech startup",
            description=(
                "Long-form (1,500–3,000 words) blog articles researched and written "
                "for SaaS, fintech, and developer tools. "
                "Keyword research included, targeting low-competition/high-intent terms. "
                "Delivered as a Google Doc with SEO metadata ready for your CMS."
            ),
            category="writing-copy",
            tags=["seo", "blog writing", "content marketing", "saas", "copywriting"],
            seller=seller2,
            packages=[
                dict(tier="basic",    name="1 Article",  description="1,500 words, 1 keyword cluster, 1 revision", price=59,  days=3, revisions=1),
                dict(tier="standard", name="3 Articles", description="3 × 2,000 words, keyword research included",  price=149, days=7, revisions=2),
                dict(tier="premium",  name="6 Articles", description="6 × 2,500 words + content calendar",          price=279, days=14, revisions=3),
            ],
            requirements=["What is your target audience?", "List 3-5 topics or keywords you want to rank for.", "What tone do you prefer? (technical, conversational, authoritative)"],
        ),
    ]

    created: list[Gig] = []
    for gd in gig_defs:
        slug = _slug(gd["title"])
        if await _exists(db, Gig, slug=slug):
            result = await db.execute(select(Gig).where(Gig.slug == slug))
            created.append(result.scalar_one())
            continue

        cat = categories.get(gd["category"])
        gig = Gig(
            id=uuid.uuid4(),
            title=gd["title"],
            slug=slug,
            description=gd["description"],
            category_id=cat.id if cat else None,
            tags=gd["tags"],
            seller_id=gd["seller"].id,
            status="active",
            rating=4.9,
            reviews_count=0,
            views=0,
            gig_level="standard",
        )
        db.add(gig)
        await db.flush()

        for i, pkg in enumerate(gd["packages"]):
            db.add(GigPackage(
                id=uuid.uuid4(),
                gig_id=gig.id,
                tier=pkg["tier"],
                name=pkg["name"],
                description=pkg["description"],
                price=pkg["price"],
                delivery_days=pkg["days"],
                revisions=pkg["revisions"],
                features=[],
            ))

        for i, q in enumerate(gd["requirements"]):
            db.add(GigRequirement(
                id=uuid.uuid4(),
                gig_id=gig.id,
                question=q,
                input_type="text",
                is_required=True,
                sort_order=i,
            ))

        # Placeholder cover image (points at a public placeholder URL)
        db.add(GigMedia(
            id=uuid.uuid4(),
            gig_id=gig.id,
            media_type="image",
            raw_key=f"raw/{gig.id}/cover.jpg",
            processed_key=None,
            url=f"https://picsum.photos/seed/{slug}/800/500",
            status="ready",
            sort_order=0,
            is_cover=True,
        ))

        db.add(GigStats(id=uuid.uuid4(), gig_id=gig.id))
        created.append(gig)

    await db.flush()
    return created


async def seed_reviews(db: AsyncSession, gigs: list[Gig], buyer: User) -> None:
    review_targets = gigs[:2]
    for i, gig in enumerate(review_targets):
        if await _exists(db, Review, gig_id=gig.id, reviewer_id=buyer.id):
            continue
        db.add(Review(
            id=uuid.uuid4(),
            gig_id=gig.id,
            reviewer_id=buyer.id,
            seller_id=gig.seller_id,
            rating=5,
            comment="Absolutely outstanding work — exceeded expectations in every way. Highly recommended!",
        ))
    await db.flush()


# ── Main ──────────────────────────────────────────────────────────────────────

async def main() -> None:
    print("Seeding dev data…")
    async with AsyncSessionLocal() as db:
        cats = await seed_categories(db)
        print(f"  ✓ {len(cats)} categories")

        seller1, seller2, buyer = await seed_users(db)
        print(f"  ✓ users: {seller1.email}, {seller2.email}, {buyer.email}")

        gigs = await seed_gigs(db, seller1, seller2, cats)
        print(f"  ✓ {len(gigs)} gigs")

        await seed_reviews(db, gigs, buyer)
        print("  ✓ reviews")

        await db.commit()

    print("\nDone! Login credentials:")
    print("  alice@adzy.dev  / Dev@12345  (seller)")
    print("  bob@adzy.dev    / Dev@12345  (seller)")
    print("  buyer@adzy.dev  / Dev@12345  (buyer)")


if __name__ == "__main__":
    asyncio.run(main())
