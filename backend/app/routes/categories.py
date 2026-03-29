from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db.session import get_db
from app.models.models import Category
from app.schemas.schemas import CategoryResponse, CategoryCreate

router = APIRouter()

@router.get("/", response_model=List[CategoryResponse])
async def get_categories(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category))
    return result.scalars().all()

@router.post("/", response_model=CategoryResponse)
async def create_category(category_in: CategoryCreate, db: AsyncSession = Depends(get_db)):
    db_cat = Category(**category_in.dict())
    db.add(db_cat)
    await db.commit()
    await db.refresh(db_cat)
    return db_cat

@router.get("/{slug}", response_model=CategoryResponse)
async def get_category_by_slug(slug: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Category).where(Category.slug == slug))
    category = result.scalar_one_or_none()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category
