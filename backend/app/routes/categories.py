from __future__ import annotations

from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from pydantic import BaseModel, Field
from app.db.session import get_db
from app.models.models import Category, Gig, User, AuditLog

router = APIRouter()


class CategoryNode(BaseModel):
    id: UUID
    name: str
    slug: str
    parent_id: UUID | None = None
    icon: str | None = None
    color: str | None = None
    sort_order: int = 0
    level: int = 0
    is_active: bool = True
    gig_count: int = 0
    children: list["CategoryNode"] = Field(default_factory=list)

    class Config:
        from_attributes = True


CategoryNode.model_rebuild()


def _build_tree(
    by_parent: dict[UUID | None, list[Category]],
    parent_id: UUID | None = None,
) -> list[CategoryNode]:
    nodes: list[CategoryNode] = []
    for cat in sorted(by_parent.get(parent_id, []), key=lambda c: c.name.lower()):
        nodes.append(
            CategoryNode(
                id=cat.id,
                name=cat.name,
                slug=cat.slug,
                parent_id=cat.parent_id,
                icon=cat.icon,
                color=cat.color,
                sort_order=cat.sort_order,
                level=cat.level,
                is_active=cat.is_active,
                gig_count=cat.gig_count,
                children=_build_tree(by_parent, cat.id),
            )
        )
    return nodes


@router.get("/", response_model=List[CategoryNode])
async def get_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category))
    categories = result.scalars().all()
    by_parent: dict[UUID | None, list[Category]] = {}
    for cat in categories:
        by_parent.setdefault(cat.parent_id, []).append(cat)
    return _build_tree(by_parent, None)

@router.post("/", response_model=CategoryResponse)
async def create_category(category_in: CategoryCreate, db: AsyncSession = Depends(get_db)):
    db_cat = Category(**category_in.dict())
    db.add(db_cat)
    await db.commit()
    await db.refresh(db_cat)
    return db_cat

@router.get("/{slug}", response_model=CategoryNode)
async def get_category_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).where(Category.slug == slug))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    all_result = await db.execute(select(Category))
    categories = all_result.scalars().all()
    by_parent: dict[UUID | None, list[Category]] = {}
    for cat in categories:
        by_parent.setdefault(cat.parent_id, []).append(cat)

    return CategoryNode(
        id=category.id,
        name=category.name,
        slug=category.slug,
        parent_id=category.parent_id,
        icon=category.icon,
        color=category.color,
        sort_order=category.sort_order,
        level=category.level,
        is_active=category.is_active,
        gig_count=category.gig_count,
        children=_build_tree(by_parent, category.id),
    )

@router.get("/{slug}/popular-services")
async def popular_services(slug: str, db: AsyncSession = Depends(get_db)):
    """Return top 12 searched services within a subcategory for the mega menu."""
    from sqlalchemy import func
    
    # We use jsonb_array_elements_text to unnest the JSON tags array into virtual rows
    # so we can group and order by usage_count directly in the database.
    tag_elements = func.jsonb_array_elements_text(func.cast(Gig.tags, JSONB)).column_valued("tag")
    
    result = await db.execute(
        select(tag_elements.label("name"), func.count().label("usage_count"))
        .select_from(Gig)
        .join(Category, Gig.category_id == Category.id)
        .where(
            Category.slug == slug, 
            Gig.status == "active"
        )
        .group_by("name")
        .order_by(func.count().desc())
        .limit(12)
    )
    
    return [{"name": r.name, "count": r.usage_count} for r in result.all()]

# ── ADMIN MUTATIONS ─────────────────────────────────────────────────────────

@router.patch("/admin/categories/{category_id}")
async def admin_update_category(
    category_id: UUID,
    body:        dict,
    db:          AsyncSession = Depends(get_db),
    admin:       User         = Depends(require_admin),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat    = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Category not found")
        
    old_vals = {"name": cat.name, "slug": cat.slug, "is_active": cat.is_active}
    for field, val in body.items():
        if hasattr(cat, field):
            setattr(cat, field, val)
            
    db.add(AuditLog(
        admin_id=admin.id, action="category.update",
        target_type="category", target_id=str(cat.id),
        old_value=old_vals, new_value=body,
    ))
    await db.commit()
    return {"status": "updated", "id": str(cat.id)}

@router.delete("/admin/categories/{category_id}")
async def admin_delete_category(
    category_id: UUID,
    db:          AsyncSession = Depends(get_db),
    admin:       User         = Depends(require_admin),
):
    result = await db.execute(select(Category).where(Category.id == category_id))
    cat    = result.scalar_one_or_none()
    if not cat:
        raise HTTPException(404, "Category not found")
        
    # Check for children
    child_count = await db.scalar(select(func.count()).select_from(Category).where(Category.parent_id == category_id))
    if child_count > 0:
        raise HTTPException(400, "Cannot delete category with children. Move or delete children first.")
        
    db.add(AuditLog(
        admin_id=admin.id, action="category.delete",
        target_type="category", target_id=str(cat.id),
        old_value={"name": cat.name, "slug": cat.slug},
    ))
    await db.delete(cat)
    await db.commit()
    return {"status": "deleted"}
