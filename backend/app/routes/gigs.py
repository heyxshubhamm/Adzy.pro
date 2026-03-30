from fastapi import APIRouter, Depends, HTTPException, Query, Response, BackgroundTasks, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, or_, func
from sqlalchemy.orm import selectinload
from typing import List, Optional
import uuid as uuid_lib
from app.db.session import get_db
from app.core.config import settings
from app.core.dependencies import require_seller, get_current_user, get_current_user_optional
from app.models.models import User, Gig, GigPackage, GigRequirement, GigMedia, Review, SellerProfile
from app.schemas.gigs import (
    GigCreateIn, GigUpdateIn, GigOut, PresignedURLRequest, PresignedURLOut,
    GigDetailOut, SellerPublicOut, ReviewDetailOut, RelatedGigOut,
)
from app.media.s3 import generate_presigned_put, delete_object as delete_s3_object, object_exists
from app.media.tasks import process_image, process_video
import re
from pydantic import BaseModel
from app.services.market_scoring import stable_ab_bucket
from app.cache.keys import K
from app.cache.cache_aside import cache_get, cache_set, CacheMiss
from app.cache.counters import increment_gig_view
from app.cache.invalidation import invalidate_gig, invalidate_search_cache
from app.cache.rate_limit import presign_limiter

router = APIRouter(tags=["gigs"])

def _load_gig_options():
    return (
        selectinload(Gig.packages),
        selectinload(Gig.requirements),
        selectinload(Gig.media),
        selectinload(Gig.seller),
    )

# --- Public marketplace list ---
@router.get("", response_model=List[GigOut])
async def list_gigs(
    request: Request,
    q: Optional[str] = Query(None, description="Search by title or tag"),
    category_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(Gig)
        .where(Gig.status == "active")
        .options(*_load_gig_options())
        .order_by(Gig.created_at.desc())
    )

    if q:
        query = query.where(
            or_(
                Gig.title.ilike(f"%{q}%"),
                Gig.description.ilike(f"%{q}%"),
            )
        )

    if category_id:
        try:
            cat_uuid = uuid_lib.UUID(category_id)
            query = query.where(Gig.category_id == cat_uuid)
        except ValueError:
            pass

    result = await db.execute(query)
    gigs = result.scalars().all()

    # A/B: route a small deterministic bucket to the new scoring ranker.
    user_fingerprint = (
        request.cookies.get("session")
        or request.headers.get("x-forwarded-for")
        or request.client.host
        or "anonymous"
    )
    bucket = stable_ab_bucket(user_fingerprint)
    use_new_scoring = bucket < settings.NEW_SCORING_TRAFFIC_PCT

    if use_new_scoring:
        query_text = (q or "").strip().lower()

        def relevance_score(gig: Gig) -> float:
            if not query_text:
                return 0.5
            title = (gig.title or "").lower()
            desc = (gig.description or "").lower()
            tags = " ".join(gig.tags or []).lower()
            if query_text in title:
                return 1.0
            if query_text in desc:
                return 0.75
            if query_text in tags:
                return 0.65
            return 0.4

        gigs = sorted(
            gigs,
            key=lambda g: (
                relevance_score(g),
                float(getattr(getattr(g, "seller", None), "seller_score", 0.0) or 0.0),
                float(getattr(g, "rating", 0.0) or 0.0),
                int(getattr(g, "reviews_count", 0) or 0),
            ),
            reverse=True,
        )

    return gigs


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    slug = re.sub(r"[\s_-]+", "-", text)[:100]
    return f"{slug}-{str(uuid_lib.uuid4())[:8]}" # uniqueness guaranteed

def _validate_media_keys(raw_key: str, processed_key: str, seller_id: str, gig_id: str) -> bool:
    expected_raw_prefix = f"raw/{seller_id}/{gig_id}/"
    expected_processed_prefix = f"gigs/{seller_id}/{gig_id}/"
    return raw_key.startswith(expected_raw_prefix) and processed_key.startswith(expected_processed_prefix)

# --- Create gig ---
@router.post("", response_model=GigOut, status_code=201)
async def create_gig(
    body: GigCreateIn,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    gig = Gig(
        seller_id = user.id,
        title = body.title,
        slug = _slugify(body.title),
        description = body.description,
        category_id = body.category_id,
        subcategory = body.subcategory,
        tags = body.tags,
        status = "draft",
    )
    db.add(gig)
    await db.flush() # get id before adding packages

    for pkg in body.packages:
        db.add(GigPackage(gig_id=gig.id, **pkg.model_dump()))

    for i, req in enumerate(body.requirements):
        db.add(GigRequirement(gig_id=gig.id, sort_order=i, **req.model_dump()))

    await db.commit()
    result2 = await db.execute(select(Gig).where(Gig.id == gig.id).options(*_load_gig_options()))
    return result2.scalar_one()

# --- Top gigs for ISR static params ---
@router.get("/top", response_model=List[GigOut])
async def top_gigs(
    limit: int = Query(100, le=500),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Gig)
        .where(Gig.status == "active")
        .options(*_load_gig_options())
        .order_by(Gig.rating.desc().nullslast(), Gig.reviews_count.desc())
        .limit(limit)
    )
    return result.scalars().all()


# --- Full gig detail by slug (reviews + related + seller profile) ---
@router.get("/slug/{slug}", response_model=GigDetailOut)
async def get_gig_detail(
    slug: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    cache_key = K.fmt(K.GIG_DETAIL, slug=slug)
    try:
        cached_data = await cache_get(cache_key)
        background_tasks.add_task(increment_gig_view, cached_data["id"])
        return cached_data
    except CacheMiss:
        pass
    except Exception:
        pass  # Redis unavailable — fall through to DB

    result = await db.execute(
        select(Gig)
        .options(
            *_load_gig_options(),
            selectinload(Gig.seller).selectinload(User.seller_profile),
        )
        .where(Gig.slug == slug, Gig.status == "active")
    )
    gig = result.scalar_one_or_none()
    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")

    # Latest 10 reviews
    reviews_result = await db.execute(
        select(Review)
        .options(selectinload(Review.reviewer))
        .where(Review.gig_id == gig.id)
        .order_by(Review.created_at.desc())
        .limit(10)
    )
    reviews = reviews_result.scalars().all()

    # Related gigs — same category, different seller, active
    related_rows = []
    if gig.category_id:
        rel_result = await db.execute(
            select(
                Gig.id, Gig.title, Gig.slug,
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
            .limit(6)
        )
        related_rows = rel_result.all()

    related_gigs = []
    for row in related_rows:
        cover_result = await db.execute(
            select(GigMedia.url)
            .where(GigMedia.gig_id == row.id, GigMedia.is_cover == True)
            .limit(1)
        )
        cover_url = cover_result.scalar_one_or_none()
        related_gigs.append(RelatedGigOut(
            id=row.id, title=row.title, slug=row.slug,
            cover_url=cover_url, price_from=row.price_from,
            avg_rating=float(row.avg_rating) if row.avg_rating else None,
            review_count=row.review_count,
        ))

    # Increment view count via Redis counter (batched flush to DB every 5 min)
    background_tasks.add_task(increment_gig_view, str(gig.id))

    # Build seller public profile
    sp: SellerProfile | None = gig.seller.seller_profile
    seller_out = SellerPublicOut(
        id=gig.seller.id,
        username=gig.seller.username,
        avatar_url=gig.seller.avatar_url,
        display_name=sp.display_name if sp else gig.seller.username,
        bio=sp.bio if sp else None,
        seller_level=sp.seller_level if sp else "new",
        member_since=gig.seller.created_at,
        completed_orders=sp.completed_orders if sp else 0,
        avg_rating=float(gig.rating) if gig.rating else None,
        review_count=gig.reviews_count,
        response_time=sp.response_time if sp else None,
        languages=sp.languages if sp else [],
        country=sp.country if sp else None,
        is_available=sp.is_available if sp else True,
    )

    review_outs = [
        ReviewDetailOut(
            id=r.id,
            rating=r.rating,
            comment=r.comment,
            created_at=r.created_at,
            buyer_name=r.reviewer.username if r.reviewer else "Buyer",
            buyer_avatar=r.reviewer.avatar_url if r.reviewer else None,
        )
        for r in reviews
    ]

    detail = GigDetailOut(
        id=gig.id,
        title=gig.title,
        slug=gig.slug,
        description=gig.description,
        tags=gig.tags or [],
        status=gig.status,
        views=gig.views or 0,
        review_count=gig.reviews_count,
        avg_rating=float(gig.rating) if gig.rating else None,
        created_at=gig.created_at,
        seller=seller_out,
        packages=gig.packages,
        requirements=[
            {"id": str(r.id), "question": r.question,
             "input_type": r.input_type, "is_required": r.is_required}
            for r in gig.requirements
        ],
        media=sorted(
            [
                {"id": str(m.id), "url": m.url, "media_type": m.media_type,
                 "is_cover": m.is_cover, "processed_urls": m.processed_urls or {}}
                for m in gig.media
            ],
            key=lambda m: m.get("sort_order", 0),
        ),
        reviews=review_outs,
        related_gigs=related_gigs,
    )

    # Store in cache — TTL 5 min (ISR on the frontend revalidates every 60s anyway)
    try:
        await cache_set(cache_key, detail.model_dump(), ttl=300)
    except Exception:
        pass

    return detail


@router.post("/{gig_id}/impression", status_code=204)
async def record_impression(
    gig_id: str,
    background_tasks: BackgroundTasks,
):
    """Client-side impression tracker — increments Redis counter, fire-and-forget."""
    background_tasks.add_task(increment_gig_view, gig_id)


# --- List seller's own gigs ---
@router.get("/my/gigs", response_model=List[GigOut])
async def my_gigs(
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Gig)
        .where(Gig.seller_id == user.id, Gig.status != "deleted")
        .options(*_load_gig_options())
        .order_by(Gig.created_at.desc())
    )
    return result.scalars().all()

# --- Get single gig (by id or slug) ---
@router.get("/{gig_id}", response_model=GigOut)
async def get_gig(
    gig_id: str,
    user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    # Try UUID lookup first, fall back to slug
    opts = _load_gig_options()
    try:
        parsed_id = uuid_lib.UUID(gig_id)
        result = await db.execute(select(Gig).where(Gig.id == parsed_id).options(*opts))
    except ValueError:
        result = await db.execute(select(Gig).where(Gig.slug == gig_id).options(*opts))

    gig = result.scalar_one_or_none()
    if not gig or gig.status == "deleted":
        raise HTTPException(status_code=404, detail="Gig not found")
    if gig.status == "draft":
        if not user or str(user.id) != str(gig.seller_id):
            raise HTTPException(status_code=404, detail="Gig not found")
    return gig

# --- Soft delete gig ---
@router.delete("/{gig_id}", status_code=204)
async def delete_gig(
    gig_id: str,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = result.scalar_one_or_none()
    if not gig or str(gig.seller_id) != str(user.id):
        raise HTTPException(status_code=404, detail="Gig not found")
    old_slug = gig.slug
    gig.status = "deleted"
    await db.commit()
    await invalidate_gig(old_slug)
    await invalidate_search_cache()

# --- Update gig ---
@router.patch("/{gig_id}", response_model=GigOut)
async def update_gig(
    gig_id: str,
    body: GigUpdateIn,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = result.scalar_one_or_none()

    if not gig:
        raise HTTPException(status_code=404, detail="Gig not found")
    if str(gig.seller_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not your gig")

    old_slug = gig.slug

    # Update base fields
    for field in ("title", "description", "category_id", "subcategory", "tags"):
        val = getattr(body, field)
        if val is not None:
            setattr(gig, field, val)
            if field == "title":
                gig.slug = _slugify(val)

    # Full replace packages
    if body.packages is not None:
        await db.execute(delete(GigPackage).where(GigPackage.gig_id == gig.id))
        for pkg in body.packages:
            db.add(GigPackage(gig_id=gig.id, **pkg.model_dump()))

    # Full replace requirements
    if body.requirements is not None:
        await db.execute(delete(GigRequirement).where(GigRequirement.gig_id == gig.id))
        for i, req in enumerate(body.requirements):
            db.add(GigRequirement(gig_id=gig.id, sort_order=i, **req.model_dump()))

    await db.commit()

    # Invalidate old slug (and new slug if title changed — it's a cache miss anyway)
    await invalidate_gig(old_slug)
    await invalidate_search_cache()

    result2 = await db.execute(select(Gig).where(Gig.id == gig.id).options(*_load_gig_options()))
    return result2.scalar_one()

# --- Publish gig ---
@router.post("/{gig_id}/publish", response_model=GigOut)
async def publish_gig(
    gig_id: str,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Gig)
        .where(Gig.id == gig_id)
        .options(selectinload(Gig.packages), selectinload(Gig.media))
    )
    gig = result.scalar_one_or_none()

    if not gig or str(gig.seller_id) != str(user.id):
        raise HTTPException(status_code=404, detail="Gig not found")
    if gig.status == "active":
        raise HTTPException(status_code=400, detail="Gig is already active")

    # Min validation for publishing
    errors = []
    if not gig.packages:
        errors.append("At least one pricing package is required")
    if not gig.media:
        errors.append("At least one gallery image is required")
    else:
        has_ready = any(m.status == "ready" for m in gig.media)
        has_cover = any(m.is_cover and m.status == "ready" for m in gig.media)
        if not has_ready:
            errors.append("At least one media file must finish processing")
        if not has_cover:
            errors.append("A ready cover image is required")
    if len(gig.description) < 120:
        errors.append("Professional description min 120 chars required")
    
    if errors:
        raise HTTPException(status_code=422, detail={"errors": errors})

    gig.status = "active"
    await db.commit()

    await invalidate_gig(gig.slug)
    await invalidate_search_cache()

    result2 = await db.execute(select(Gig).where(Gig.id == gig.id).options(*_load_gig_options()))
    return result2.scalar_one()

# --- S3 Media Endpoints ---

@router.post("/{gig_id}/media/presign", response_model=PresignedURLOut)
async def presign_media_upload(
    gig_id: str,
    body: PresignedURLRequest,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
    _rl: None = Depends(presign_limiter),
):
    result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = result.scalar_one_or_none()
    if not gig or str(gig.seller_id) != str(user.id):
        raise HTTPException(status_code=404, detail="Gig not found")

    count_result = await db.execute(
        select(func.count()).select_from(GigMedia).where(GigMedia.gig_id == gig.id)
    )
    if count_result.scalar() >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 media files per gig")

    try:
        data = generate_presigned_put(
            seller_id=str(user.id),
            gig_id=gig_id,
            content_type=body.content_type,
            file_size=body.file_size,
            media_type=body.media_type,
        )
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    return data


class MediaConfirmIn(BaseModel):
    raw_key: str
    processed_key: str
    public_url: str
    media_type: str
    is_cover: bool = False


@router.post("/{gig_id}/media/confirm")
async def confirm_media_upload(
    gig_id: str,
    body: MediaConfirmIn,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = result.scalar_one_or_none()
    if not gig or str(gig.seller_id) != str(user.id):
        raise HTTPException(status_code=404, detail="Gig not found")

    if body.media_type not in {"image", "video"}:
        raise HTTPException(status_code=422, detail="Invalid media_type")

    if not _validate_media_keys(body.raw_key, body.processed_key, str(user.id), gig_id):
        raise HTTPException(status_code=400, detail="Invalid media key scope")

    if body.public_url and body.processed_key not in body.public_url:
        raise HTTPException(status_code=400, detail="public_url does not match processed key")

    # Verify file actually landed in S3
    if not object_exists(body.raw_key):
        raise HTTPException(status_code=400, detail="Upload not found in S3. Please try uploading again.")

    count_result = await db.execute(
        select(func.count()).select_from(GigMedia).where(GigMedia.gig_id == gig.id)
    )
    sort_order = count_result.scalar()
    if sort_order >= 5:
        raise HTTPException(status_code=400, detail="Maximum 5 media files per gig")

    existing_result = await db.execute(
        select(GigMedia).where(GigMedia.gig_id == gig.id, GigMedia.raw_key == body.raw_key)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="This upload has already been confirmed")

    # Unset existing cover if this one is cover (or it's the first file)
    if body.is_cover or sort_order == 0:
        await db.execute(
            GigMedia.__table__.update()
            .where(GigMedia.gig_id == gig.id)
            .values(is_cover=False)
        )

    media = GigMedia(
        gig_id=gig.id,
        media_type=body.media_type,
        raw_key=body.raw_key,
        processed_key=body.processed_key,
        url=body.public_url,
        status="processing",
        sort_order=sort_order,
        is_cover=body.is_cover or sort_order == 0,
    )
    db.add(media)
    await db.commit()
    await db.refresh(media)

    # Dispatch async processing
    if body.media_type == "image":
        process_image.delay(body.raw_key, body.processed_key, str(media.id))
    else:
        process_video.delay(body.raw_key, body.processed_key, str(media.id))

    return {"id": str(media.id), "status": "processing", "url": body.public_url}


@router.get("/{gig_id}/media/{media_id}/status")
async def media_status(
    gig_id: str,
    media_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Frontend polls this until status = 'ready'."""
    result = await db.execute(
        select(GigMedia).where(GigMedia.id == media_id, GigMedia.gig_id == gig_id)
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return {
        "id": str(media.id),
        "status": media.status,
        "processed_urls": media.processed_urls,
        "url": media.url,
    }


@router.delete("/{gig_id}/media/{media_id}", status_code=204)
async def delete_media(
    gig_id: str,
    media_id: str,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GigMedia).where(GigMedia.id == media_id, GigMedia.gig_id == gig_id)
    )
    media = result.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Verify ownership via gig
    gig_result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = gig_result.scalar_one_or_none()
    if not gig or str(gig.seller_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not your gig")

    delete_s3_object(media.raw_key)
    if media.processed_key:
        delete_s3_object(media.processed_key)
    if media.processed_urls:
        for _, url in (media.processed_urls or {}).items():
            if isinstance(url, str) and "/gigs/" in url:
                key = url.split("/gigs/", 1)[-1]
                delete_s3_object(f"gigs/{key}")

    await db.delete(media)
    await db.commit()


class ReorderIn(BaseModel):
    ordered_ids: list[str]


@router.patch("/{gig_id}/media/reorder", status_code=204)
async def reorder_media(
    gig_id: str,
    body: ReorderIn,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    gig_result = await db.execute(select(Gig).where(Gig.id == gig_id))
    gig = gig_result.scalar_one_or_none()
    if not gig or str(gig.seller_id) != str(user.id):
        raise HTTPException(status_code=403, detail="Not your gig")

    result = await db.execute(
        select(GigMedia).where(GigMedia.gig_id == gig_id)
    )
    media_map = {str(m.id): m for m in result.scalars().all()}

    for i, mid in enumerate(body.ordered_ids):
        if mid in media_map:
            media_map[mid].sort_order = i
            media_map[mid].is_cover = i == 0

    await db.commit()
