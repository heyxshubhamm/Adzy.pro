from __future__ import annotations

import re
from decimal import Decimal
from enum import Enum
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


class SortBy(str, Enum):
    relevance  = "relevance"
    price_asc  = "price_asc"
    price_desc = "price_desc"
    rating     = "rating"
    newest     = "newest"
    popular    = "popular"


class SearchParams(BaseModel):
    q:             Optional[str]     = Field(None, max_length=200)
    category:      Optional[str]     = None
    subcategory:   Optional[str]     = None
    tags:          Optional[str]     = None   # comma-separated
    min_price:     Optional[Decimal] = Field(None, ge=0)
    max_price:     Optional[Decimal] = Field(None, ge=0)
    delivery_days: Optional[int]     = Field(None, ge=1, le=365)
    min_rating:    Optional[float]   = Field(None, ge=0, le=5)
    seller_level:  Optional[str]     = None
    sort:          SortBy            = SortBy.relevance
    page:          int               = Field(1, ge=1)
    limit:         int               = Field(20, ge=1, le=50)

    @field_validator("q")
    @classmethod
    def sanitise_query(cls, v: Optional[str]) -> Optional[str]:
        if v:
            v = re.sub(r"[^\w\s\-]", " ", v).strip()
            v = " ".join(v.split())
        return v or None

    @property
    def tag_list(self) -> List[str]:
        if not self.tags:
            return []
        return [t.strip().lower() for t in self.tags.split(",") if t.strip()]

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.limit


class GigSearchResult(BaseModel):
    id:                UUID
    title:             str
    slug:              str
    cover_url:         Optional[str]
    seller_name:       str
    seller_level:      Optional[str]
    price_from:        Decimal
    delivery_days_min: int
    avg_rating:        Optional[float]
    review_count:      int
    tags:              List[str]
    rank:              Optional[float] = None

    model_config = {"from_attributes": True}


class SearchResponse(BaseModel):
    results:     List[GigSearchResult]
    total:       int
    page:        int
    pages:       int
    query:       Optional[str]
    facets:      dict
    suggestions: List[str] = []
    took_ms:     float
