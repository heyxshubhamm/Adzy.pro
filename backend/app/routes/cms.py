"""
CMS Routes — Static Pages + Sitemap
Public: GET /pages/{slug}, GET /sitemap.xml
Admin:  Full CRUD via /admin/cms/*
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response as HTTPResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.models import User, StaticPage, SitemapEntry, Gig, Category, AuditLog
import uuid

public_router = APIRouter(prefix="/pages", tags=["cms-public"])
admin_router  = APIRouter(prefix="/admin/cms", tags=["admin-cms"])

# ════════════════════════════════════════════════════════════════════
# PYDANTIC SCHEMAS
# ════════════════════════════════════════════════════════════════════

class StaticPageIn(BaseModel):
    title:           str
    slug:            str
    content:         str
    seo_title:       Optional[str] = None
    seo_description: Optional[str] = None
    meta_keywords:   Optional[str] = None
    og_image_url:    Optional[str] = None
    is_published:    bool = True

class StaticPageUpdate(BaseModel):
    title:           Optional[str] = None
    content:         Optional[str] = None
    seo_title:       Optional[str] = None
    seo_description: Optional[str] = None
    meta_keywords:   Optional[str] = None
    og_image_url:    Optional[str] = None
    is_published:    Optional[bool] = None

class SitemapEntryIn(BaseModel):
    url:        str
    changefreq: str = "weekly"
    priority:   float = 0.5
    is_active:  bool = True

# ════════════════════════════════════════════════════════════════════
# PUBLIC ENDPOINTS
# ════════════════════════════════════════════════════════════════════

@public_router.get("/")
async def list_public_pages(db: AsyncSession = Depends(get_db)):
    """Returns published static pages (for footer nav, etc.)."""
    result = await db.execute(
        select(StaticPage.id, StaticPage.title, StaticPage.slug)
        .where(StaticPage.is_published == True)
        .order_by(StaticPage.title)
    )
    rows = result.all()
    return [{"id": str(r.id), "title": r.title, "slug": r.slug} for r in rows]

@public_router.get("/{slug}")
async def get_page(slug: str, db: AsyncSession = Depends(get_db)):
    """Returns a single published static page by slug."""
    result = await db.execute(
        select(StaticPage).where(StaticPage.slug == slug, StaticPage.is_published == True)
    )
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Page not found or unpublished")
    return {
        "id":              str(page.id),
        "title":           page.title,
        "slug":            page.slug,
        "content":         page.content,
        "seo_title":       page.seo_title,
        "seo_description": page.seo_description,
        "meta_keywords":   page.meta_keywords,
        "og_image_url":    page.og_image_url,
        "updated_at":      page.updated_at,
    }

# ════════════════════════════════════════════════════════════════════
# SITEMAP.XML — Merges DB entries + live gig/category data
# ════════════════════════════════════════════════════════════════════

sitemap_router = APIRouter(tags=["sitemap"])

@sitemap_router.get("/sitemap.xml", response_class=HTTPResponse)
async def sitemap_xml(db: AsyncSession = Depends(get_db)):
    """
    Dynamic sitemap combining:
    1. Manual SitemapEntry rows (admin-controlled)
    2. All active gig URLs
    3. All active category URLs
    """
    entries: List[dict] = []

    # 1. Manual entries
    result = await db.execute(select(SitemapEntry).where(SitemapEntry.is_active == True))
    for e in result.scalars().all():
        entries.append({"url": e.url, "changefreq": str(e.changefreq),
                        "priority": float(e.priority), "lastmod": e.lastmod})

    # 2. Live gigs
    gig_result = await db.execute(
        select(Gig.slug, Gig.updated_at).where(Gig.status == "active")
    )
    for slug, updated_at in gig_result.all():
        entries.append({
            "url": f"/gigs/{slug}",
            "changefreq": "weekly",
            "priority": 0.8,
            "lastmod": updated_at,
        })

    # 3. Categories
    cat_result = await db.execute(
        select(Category.slug, Category.created_at).where(Category.is_active == True)
    )
    for slug, created_at in cat_result.all():
        entries.append({
            "url": f"/categories/{slug}",
            "changefreq": "weekly",
            "priority": 0.7,
            "lastmod": created_at,
        })

    # Build XML
    base_url = "https://adzy.pro"
    xml_parts = ['<?xml version="1.0" encoding="UTF-8"?>',
                 '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for e in entries:
        lastmod = e["lastmod"]
        lastmod_str = lastmod.strftime("%Y-%m-%d") if lastmod else datetime.now(timezone.utc).strftime("%Y-%m-%d")
        url = e["url"] if e["url"].startswith("http") else f"{base_url}{e['url']}"
        xml_parts.append(f"""  <url>
    <loc>{url}</loc>
    <lastmod>{lastmod_str}</lastmod>
    <changefreq>{e["changefreq"]}</changefreq>
    <priority>{e["priority"]:.1f}</priority>
  </url>""")
    xml_parts.append("</urlset>")

    return HTTPResponse(
        content="\n".join(xml_parts),
        media_type="application/xml",
        headers={"Cache-Control": "public, max-age=3600"},
    )

# ════════════════════════════════════════════════════════════════════
# ADMIN ENDPOINTS
# ════════════════════════════════════════════════════════════════════

@admin_router.get("/pages")
async def admin_list_pages(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(StaticPage).order_by(desc(StaticPage.updated_at)))
    pages = result.scalars().all()
    return [
        {"id": str(p.id), "title": p.title, "slug": p.slug,
         "is_published": p.is_published, "updated_at": p.updated_at}
        for p in pages
    ]

@admin_router.post("/pages", status_code=201)
async def admin_create_page(
    body: StaticPageIn,
    db:   AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    # ensure slug uniqueness
    existing = await db.execute(select(StaticPage).where(StaticPage.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(400, f"Slug '{body.slug}' is already taken")

    page = StaticPage(
        **body.model_dump(),
        created_by=admin.id,
        published_at=datetime.now(timezone.utc) if body.is_published else None,
    )
    db.add(page)
    db.add(AuditLog(
        admin_id=admin.id, action="cms.page.create",
        target_type="static_page", target_id=body.slug,
        new_value={"title": body.title, "slug": body.slug},
    ))
    await db.commit()
    await db.refresh(page)
    return {"id": str(page.id), "slug": page.slug, "title": page.title}

@admin_router.get("/pages/{page_id}")
async def admin_get_page(
    page_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    result = await db.execute(select(StaticPage).where(StaticPage.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Page not found")
    return page

@admin_router.patch("/pages/{page_id}")
async def admin_update_page(
    page_id: str,
    body:    StaticPageUpdate,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(require_admin),
):
    result = await db.execute(select(StaticPage).where(StaticPage.id == page_id))
    page = result.scalar_one_or_none()
    if not page:
        raise HTTPException(404, "Page not found")

    old_vals = {"title": page.title, "is_published": page.is_published}
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(page, field, val)
    if body.is_published and not page.published_at:
        page.published_at = datetime.now(timezone.utc)

    db.add(AuditLog(
        admin_id=admin.id, action="cms.page.update",
        target_type="static_page", target_id=str(page.id),
        old_value=old_vals, new_value=body.model_dump(exclude_unset=True),
    ))
    await db.commit()
    return {"message": "Page updated", "id": page_id}

@admin_router.delete("/pages/{page_id}", status_code=204)
async def admin_delete_page(
    page_id: str, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)
):
    result = await db.execute(select(StaticPage).where(StaticPage.id == page_id))
    page = result.scalar_one_or_none()
    if page:
        db.add(AuditLog(
            admin_id=admin.id, action="cms.page.delete",
            target_type="static_page", target_id=str(page.id),
            old_value={"slug": page.slug, "title": page.title},
        ))
        await db.delete(page)
        await db.commit()

# ── Sitemap Admin ──────────────────────────────────────────────────

@admin_router.get("/sitemap")
async def admin_list_sitemap(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(SitemapEntry).order_by(SitemapEntry.url))
    return result.scalars().all()

@admin_router.post("/sitemap", status_code=201)
async def admin_create_sitemap_entry(
    body: SitemapEntryIn, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    entry = SitemapEntry(**body.model_dump())
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return {"id": str(entry.id), "url": entry.url}

@admin_router.delete("/sitemap/{entry_id}", status_code=204)
async def admin_delete_sitemap_entry(
    entry_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)
):
    result = await db.execute(select(SitemapEntry).where(SitemapEntry.id == entry_id))
    entry = result.scalar_one_or_none()
    if entry:
        await db.delete(entry)
        await db.commit()
