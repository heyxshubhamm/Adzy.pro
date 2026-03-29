from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.models import User
from app.services.market_scoring import (
    get_cached_or_db_score,
    load_weights,
    recompute_all_seller_scores,
    validate_and_update_weights,
)

router = APIRouter(prefix="/v1/score", tags=["score"])


class WeightUpdateIn(BaseModel):
    weights: dict[str, float] = Field(default_factory=dict)


@router.get("/weights/current")
async def get_current_weights(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    weights = await load_weights(db)
    total = round(sum(weights.values()), 2)
    return {"weights": weights, "total": total}


@router.put("/weights")
async def update_weights(
    body: WeightUpdateIn,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    try:
        updated = await validate_and_update_weights(db, body.weights, updated_by=admin.username)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    return {"weights": updated, "total": round(sum(updated.values()), 2)}


@router.post("/recompute")
async def recompute_scores_now(
    _: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await recompute_all_seller_scores(db)
    return {"status": "ok", "result": result}


@router.get("/{seller_id}")
async def get_seller_score(
    seller_id: str,
    db: AsyncSession = Depends(get_db),
):
    score = await get_cached_or_db_score(db, seller_id)
    if score is None:
        raise HTTPException(status_code=404, detail="Seller not found")
    return {"seller_id": seller_id, "score": score}
