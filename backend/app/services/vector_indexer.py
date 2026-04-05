import os
from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import Gig
import json
from app.services.ai_client import get_embedding_with_failover

async def index_gig_vector(db: AsyncSession, gig: Gig):
    """
    Generate an embedding vector for a gig and save it.
    """
    text_content = f"Title: {gig.title}\nCategory: {gig.category.name if gig.category else gig.category_id}\nTags: {', '.join(gig.tags or [])}\nDescription: {gig.description}"
    
    embedding = await get_embedding_with_failover(text_content)
    if embedding:
        gig.embedding = embedding
        db.add(gig)
        await db.commit()
    
async def index_all_missing_vectors(db: AsyncSession):
    """
    Background job to index all gigs missing embeddings.
    """
    result = await db.execute(select(Gig).where(Gig.embedding == None))
    gigs = result.scalars().all()
    
    count = 0
    for gig in gigs:
        await index_gig_vector(db, gig)
        count += 1
        
    return count
