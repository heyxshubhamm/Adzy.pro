from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Any, Optional
from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.models import User, SiteConfig, FeatureFlag, AuditLog, HomepageSection, Coupon
from app.services.config_service import set_config, get_all_public_configs, is_feature_enabled
from sqlalchemy import select, desc, update
from datetime import datetime
from typing import Any, Optional, List
import httpx, os

admin_router = APIRouter(prefix="/admin/config", tags=["admin-config"])
public_router = APIRouter(prefix="/public", tags=["public-config"])

class ConfigUpdateIn(BaseModel):
    value: Any

class FeatureFlagUpdateIn(BaseModel):
    is_enabled:    Optional[bool] = None
    rollout_pct:   Optional[int]  = None
    allowed_roles: Optional[list] = None

# ════════════════════════════════════════════════════════════════════
# PUBLIC OMNI-READERS (Next.js Cache Revalidation Targets)
# ════════════════════════════════════════════════════════════════════

@public_router.get("/config")
async def get_public_site_config():
    """Returns all public site configs. Handled by Fast Redis fallback."""
    return await get_all_public_configs()

@public_router.get("/flags/{key}")
async def check_public_feature_flag(key: str, user_id: Optional[str] = None):
    """Checks if a feature is enabled dynamically based on rollouts."""
    enabled = await is_feature_enabled(key, user_id=user_id)
    return {"enabled": enabled}

# ════════════════════════════════════════════════════════════════════
# ADMIN MUTATORS
# ════════════════════════════════════════════════════════════════════

@admin_router.get("/")
async def list_configs(
    category: Optional[str] = None,
    db:       AsyncSession  = Depends(get_db),
    _:        User          = Depends(require_admin),
):
    query = select(SiteConfig).order_by(SiteConfig.category, SiteConfig.key)
    if category:
        query = query.where(SiteConfig.category == category)
    result = await db.execute(query)
    configs = result.scalars().all()
    return [
        {"key": c.key, "value": c.value, "type": c.value_type,
         "category": c.category, "label": c.label,
         "description": c.description, "is_public": c.is_public}
        for c in configs
    ]

@admin_router.patch("/{key}")
async def update_config(
    key:     str,
    body:    ConfigUpdateIn,
    request: Request,
    db:      AsyncSession = Depends(get_db),
    admin:   User         = Depends(require_admin),
):
    await set_config(key, body.value, str(admin.id), db)

    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/api/revalidate",
                json    = {"tags": ["site-config"]},
                headers = {"x-revalidate-secret": os.getenv("REVALIDATE_SECRET", "super-secret-key")},
                timeout = 3,
            )
    except Exception as e:
        print(f"Warning: Failed to invalidate next.js cache: {e}")

    return {"message": "Config updated", "key": key, "value": body.value}

@admin_router.get("/flags")
async def list_flags(
    db: AsyncSession = Depends(get_db),
    _:  User         = Depends(require_admin),
):
    result = await db.execute(select(FeatureFlag).order_by(FeatureFlag.key))
    flags  = result.scalars().all()
    return [
        {"key": f.key, "label": f.label, "is_enabled": f.is_enabled,
         "rollout_pct": f.rollout_pct, "allowed_roles": f.allowed_roles}
        for f in flags
    ]

@admin_router.patch("/flags/{key}")
async def update_flag(
    key:   str,
    body:  FeatureFlagUpdateIn,
    db:    AsyncSession = Depends(get_db),
    admin: User         = Depends(require_admin),
):
    result = await db.execute(select(FeatureFlag).where(FeatureFlag.key == key))
    flag   = result.scalar_one_or_none()
    if not flag:
        raise HTTPException(404, "Feature flag not found")

    old_state = {"enabled": flag.is_enabled, "pct": flag.rollout_pct}
    for field, val in body.model_dump(exclude_unset=True).items():
        setattr(flag, field, val)

    db.add(AuditLog(
        admin_id    = admin.id,
        action      = "flag.update",
        target_type = "feature_flag",
        target_id   = key,
        old_value   = old_state,
        new_value   = body.model_dump(exclude_unset=True),
    ))
    await db.commit()

    from app.services.config_service import _cache_delete
    await _cache_delete(f"flag:{key}")

    return {"message": "Flag updated", "key": key}

@admin_router.get("/audit-log")
async def get_audit_log(
    page:  int = 1,
    limit: int = 50,
    db:    AsyncSession = Depends(get_db),
    _:     User         = Depends(require_admin),
):
    result = await db.execute(
        select(AuditLog)
        .order_by(desc(AuditLog.created_at))
        .offset((page-1)*limit)
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        {"id": str(l.id), "admin_id": str(l.admin_id),
         "action": l.action, "target_type": l.target_type,
         "target_id": l.target_id, "old_value": l.old_value,
         "new_value": l.new_value, "created_at": l.created_at}
        for l in logs
    ]

# ════════════════════════════════════════════════════════════════════
# HOMEPAGE BUILDER
# ════════════════════════════════════════════════════════════════════

class SectionUpdateIn(BaseModel):
    is_visible:  Optional[bool] = None
    sort_order:  Optional[int]  = None
    config:      Optional[dict] = None

class ReorderIn(BaseModel):
    ordered_ids: List[str]

@admin_router.get("/homepage/sections")
async def list_sections(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(HomepageSection).order_by(HomepageSection.sort_order))
    return result.scalars().all()

@admin_router.patch("/homepage/sections/{section_id}")
async def update_section(
    section_id: str, 
    body: SectionUpdateIn, 
    db: AsyncSession = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    result = await db.execute(select(HomepageSection).where(HomepageSection.id == section_id))
    section = result.scalar_one_or_none()
    if not section: raise HTTPException(404, "Section not found")
    
    old_values = {"is_visible": section.is_visible, "config": section.config}
    for f, v in body.model_dump(exclude_unset=True).items():
        setattr(section, f, v)
        
    db.add(AuditLog(
        admin_id=admin.id, 
        action="homepage.update_section",
        target_type="homepage_section", 
        target_id=section_id,
        old_value=old_values,
        new_value=body.model_dump(exclude_unset=True)
    ))
    await db.commit()
    
    from app.services.config_service import _cache_delete
    await _cache_delete("homepage:sections")
    
    # Industrial Revalidation
    await _trigger_revalidate(["homepage"])
    return section

@admin_router.patch("/homepage/reorder", status_code=204)
async def reorder_sections(
    body: ReorderIn, 
    db: AsyncSession = Depends(get_db), 
    admin: User = Depends(require_admin)
):
    for i, sid in enumerate(body.ordered_ids):
        await db.execute(update(HomepageSection).where(HomepageSection.id == sid).values(sort_order=i))
    
    db.add(AuditLog(
        admin_id=admin.id,
        action="homepage.reorder",
        target_type="homepage",
        target_id="sections",
        new_value={"ordered_ids": body.ordered_ids}
    ))
    await db.commit()
    
    from app.services.config_service import _cache_delete
    await _cache_delete("homepage:sections")
    await _trigger_revalidate(["homepage"])

@admin_router.post("/homepage/sync")
async def force_sync_homepage(admin: User = Depends(require_admin)):
    """Manually force revalidation of homepage cache nodes."""
    await _trigger_revalidate(["homepage"])
    return {"message": "Sync signal broadcasted"}

async def _trigger_revalidate(tags: list):
    try:
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{os.getenv('FRONTEND_URL', 'http://localhost:3000')}/api/revalidate",
                json={"tags": tags},
                headers={"x-revalidate-secret": os.getenv("REVALIDATE_SECRET", "super-secret-key")},
                timeout=5,
            )
    except Exception as e:
        print(f"Industrial Revalidate Error: {e}")

# ════════════════════════════════════════════════════════════════════
# COUPONS
# ════════════════════════════════════════════════════════════════════

class CouponCreateIn(BaseModel):
    code:             str
    type:             str      # "percentage" | "fixed"
    value:            float    # 20 for 20% or $20
    usage_limit:      int
    expiry_date:      datetime
    min_order_amount: Optional[float] = None
    applies_to:       str = "all"   # "all" | "first_order" | "category:{slug}"

@admin_router.get("/coupons")
async def list_coupons(db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(Coupon).order_by(Coupon.created_at.desc()))
    return result.scalars().all()

@admin_router.post("/coupons", status_code=201)
async def create_coupon(body: CouponCreateIn, db: AsyncSession = Depends(get_db), admin: User = Depends(require_admin)):
    existing = await db.execute(select(Coupon).where(Coupon.code == body.code.upper()))
    if existing.scalar_one_or_none(): raise HTTPException(400, "Coupon code already exists")
    
    coupon = Coupon(**body.model_dump(), code=body.code.upper(), usage_count=0, is_active=True)
    db.add(coupon)
    db.add(AuditLog(admin_id=admin.id, action="coupon.create",
                    target_type="coupon", target_id=body.code.upper(), new_value=body.model_dump(mode='json')))
    await db.commit()
    return coupon

@admin_router.delete("/coupons/{coupon_id}", status_code=204)
async def delete_coupon(coupon_id: str, db: AsyncSession = Depends(get_db), _: User = Depends(require_admin)):
    result = await db.execute(select(Coupon).where(Coupon.id == coupon_id))
    coupon = result.scalar_one_or_none()
    if coupon: 
        await db.delete(coupon)
        await db.commit()
