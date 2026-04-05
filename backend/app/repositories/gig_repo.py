"""
GigRepository — keeps all Gig-related queries out of route handlers.

Usage in a router:
    from app.repositories.gig_repo import GigRepository

    async def get_repo(db: AsyncSession = Depends(get_db)) -> GigRepository:
        return GigRepository(db)

    @router.get("/{slug}")
    async def detail(slug: str, repo: GigRepository = Depends(get_repo)):
        gig = await repo.get_by_slug(slug)
        if not gig:
            raise HTTPException(404)
        return gig
"""
from __future__ import annotations

import uuid
from typing import Optional
from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.models import (
    Gig,
    GigMedia,
    GigPackage,
    GigRequirement,
    Review,
    SellerProfile,
    User,
)


class GigRepository:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Reads ─────────────────────────────────────────────────────────────────

    async def get_by_id(
        self, gig_id: UUID | str, load_relations: bool = False
    ) -> Optional[Gig]:
        try:
            parsed = uuid.UUID(str(gig_id))
        except ValueError:
            return None

        query = select(Gig).where(Gig.id == parsed)
        if load_relations:
            query = query.options(
                selectinload(Gig.packages),
                selectinload(Gig.requirements),
                selectinload(Gig.media),
                selectinload(Gig.seller),
            )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Gig]:
        """Full detail load — packages, media, seller + seller_profile."""
        result = await self.db.execute(
            select(Gig)
            .options(
                selectinload(Gig.packages),
                selectinload(Gig.requirements),
                selectinload(Gig.media),
                selectinload(Gig.seller).selectinload(User.seller_profile),
            )
            .where(Gig.slug == slug, Gig.status == "active")
        )
        return result.scalar_one_or_none()

    async def list_by_seller(
        self,
        seller_id: UUID | str,
        status: Optional[str] = None,
    ) -> list[Gig]:
        query = (
            select(Gig)
            .options(
                selectinload(Gig.packages),
                selectinload(Gig.requirements),
                selectinload(Gig.media),
            )
            .where(Gig.seller_id == seller_id)
        )
        if status:
            query = query.where(Gig.status == status)
        else:
            query = query.where(Gig.status != "deleted")
        query = query.order_by(Gig.created_at.desc())
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_active(
        self,
        q: Optional[str] = None,
        category_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Gig]:
        query = (
            select(Gig)
            .options(
                selectinload(Gig.packages),
                selectinload(Gig.media),
                selectinload(Gig.seller),
            )
            .where(Gig.status == "active")
            .order_by(Gig.rating.desc().nullslast(), Gig.reviews_count.desc())
            .limit(limit)
            .offset(offset)
        )
        if q:
            from sqlalchemy import or_
            query = query.where(
                or_(Gig.title.ilike(f"%{q}%"), Gig.description.ilike(f"%{q}%"))
            )
        if category_id:
            try:
                query = query.where(Gig.category_id == uuid.UUID(category_id))
            except ValueError:
                pass
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_related(
        self, gig: Gig, limit: int = 6
    ) -> list[dict]:
        """Return lightweight related-gig rows (no ORM objects)."""
        if not gig.category_id:
            return []

        rows_result = await self.db.execute(
            select(
                Gig.id,
                Gig.title,
                Gig.slug,
                Gig.rating.label("avg_rating"),
                Gig.reviews_count.label("review_count"),
                func.min(GigPackage.price).label("price_from"),
            )
            .join(GigPackage, GigPackage.gig_id == Gig.id)
            .where(
                Gig.category_id == gig.category_id,
                Gig.seller_id != gig.seller_id,
                Gig.status == "active",
                Gig.id != gig.id,
            )
            .group_by(Gig.id, Gig.title, Gig.slug, Gig.rating, Gig.reviews_count)
            .order_by(Gig.rating.desc().nullslast())
            .limit(limit)
        )
        rows = rows_result.all()

        related: list[dict] = []
        for row in rows:
            cover = await self.db.execute(
                select(GigMedia.url)
                .where(GigMedia.gig_id == row.id, GigMedia.is_cover.is_(True))
                .limit(1)
            )
            cover_url = cover.scalar_one_or_none()
            related.append(
                {
                    "id": str(row.id),
                    "title": row.title,
                    "slug": row.slug,
                    "cover_url": cover_url,
                    "price_from": float(row.price_from) if row.price_from else 0.0,
                    "avg_rating": float(row.avg_rating) if row.avg_rating else None,
                    "review_count": row.review_count,
                }
            )
        return related

    async def get_top(self, limit: int = 100) -> list[Gig]:
        result = await self.db.execute(
            select(Gig)
            .options(
                selectinload(Gig.packages),
                selectinload(Gig.media),
                selectinload(Gig.seller),
            )
            .where(Gig.status == "active")
            .order_by(Gig.rating.desc().nullslast(), Gig.reviews_count.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_reviews(self, gig_id: UUID | str, limit: int = 10) -> list[Review]:
        result = await self.db.execute(
            select(Review)
            .options(selectinload(Review.reviewer))
            .where(Review.gig_id == gig_id)
            .order_by(Review.created_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    # ── Writes ────────────────────────────────────────────────────────────────

    async def increment_views(self, gig_id: UUID | str) -> None:
        """
        Increment views in Postgres directly.
        Prefer cache.counters.increment_gig_view() for request-path use —
        this method is for the Celery batch flush.
        """
        await self.db.execute(
            update(Gig)
            .where(Gig.id == gig_id)
            .values(views=Gig.views + 1)
        )
        # No commit — caller owns the transaction boundary.

    async def update_review_stats(self, gig_id: UUID | str) -> None:
        """Recalculate avg_rating and reviews_count from the reviews table."""
        stats = await self.db.execute(
            select(
                func.count(Review.id).label("cnt"),
                func.avg(Review.rating).label("avg"),
            ).where(Review.gig_id == gig_id)
        )
        row = stats.one()
        await self.db.execute(
            update(Gig)
            .where(Gig.id == gig_id)
            .values(reviews_count=row.cnt, rating=row.avg)
        )

    async def soft_delete(self, gig: Gig) -> None:
        gig.status = "deleted"
        # Caller commits.
