from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Sequence

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models.models import Category


@dataclass
class CategorySeed:
    name: str
    slug: str
    children: list["CategorySeed"] = field(default_factory=list)


CATEGORY_TREE: list[CategorySeed] = [
    CategorySeed("Programming & Tech", "programming-tech"),
    CategorySeed("Graphics & Design", "graphics-design"),
    CategorySeed("Digital Marketing", "digital-marketing"),
    CategorySeed("Writing & Translation", "writing-translation"),
    CategorySeed("Video & Animation", "video-animation"),
    CategorySeed("Music & Audio", "music-audio"),
    CategorySeed("Business Services", "business-services"),
    CategorySeed("Data & AI", "data-ai"),
    CategorySeed("Lifestyle", "lifestyle"),
    CategorySeed("Photography", "photography", children=[
        CategorySeed("Products & Lifestyle", "products-lifestyle", children=[
            CategorySeed("Product Photographers", "product-photographers"),
            CategorySeed("Food Photographers", "food-photographers"),
            CategorySeed("Lifestyle & Fashion Photographers", "lifestyle-fashion-photographers"),
        ]),
        CategorySeed("People & Scenes", "people-scenes", children=[
            CategorySeed("Portrait Photographers", "portrait-photographers"),
            CategorySeed("Event Photographers", "event-photographers"),
            CategorySeed("Real Estate Photographers", "real-estate-photographers"),
            CategorySeed("Scenic Photographers", "scenic-photographers"),
            CategorySeed("Drone Photographers", "drone-photographers"),
        ]),
        CategorySeed("Local Photography", "local-photography", children=[
            CategorySeed("Photographers in New York", "photographers-in-new-york"),
            CategorySeed("Photographers in Los Angeles", "photographers-in-los-angeles"),
            CategorySeed("Photographers in London", "photographers-in-london"),
            CategorySeed("Photographers in Paris", "photographers-in-paris"),
            CategorySeed("All Cities", "all-cities"),
        ]),
        CategorySeed("Miscellaneous", "miscellaneous", children=[
            CategorySeed("Photography Classes", "photography-classes"),
            CategorySeed("Photo Preset Creation", "photo-preset-creation"),
            CategorySeed("Other", "other"),
        ]),
    ]),
    CategorySeed("E-commerce", "e-commerce"),
    CategorySeed("Cybersecurity", "cybersecurity"),
    CategorySeed("Mobile Apps", "mobile-apps"),
    CategorySeed("DevOps", "devops"),
]


async def _upsert_category(
    tree_node: CategorySeed,
    parent_id,
    *,
    session,
) -> Category:
    result = await session.execute(select(Category).where(Category.slug == tree_node.slug))
    existing = result.scalar_one_or_none()

    if existing:
        changed = False
        if existing.name != tree_node.name:
            existing.name = tree_node.name
            changed = True
        if existing.parent_id != parent_id:
            existing.parent_id = parent_id
            changed = True
        if changed:
            print(f"♻️ Updated: {tree_node.name} ({tree_node.slug})")
        else:
            print(f"ℹ️  Exists:  {tree_node.name} ({tree_node.slug})")
        category = existing
    else:
        category = Category(name=tree_node.name, slug=tree_node.slug, parent_id=parent_id)
        session.add(category)
        await session.flush()
        print(f"✅ Created: {tree_node.name} ({tree_node.slug})")

    for child in tree_node.children:
        await _upsert_category(child, category.id, session=session)

    return category


async def seed(tree: Sequence[CategorySeed] = CATEGORY_TREE) -> None:
    async with AsyncSessionLocal() as session:
        try:
            for root in tree:
                await _upsert_category(root, None, session=session)
            await session.commit()
            print("\n✨ Category tree seeded successfully")
        except Exception:
            await session.rollback()
            raise


if __name__ == "__main__":
    asyncio.run(seed())
