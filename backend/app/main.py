import asyncio
from contextlib import suppress
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, listings, tracking, orders, payments, admin, categories, verification, insights, roles, gigs, reviews, chat, disputes, kyc, sellers, score
from app.core.config import settings
from app.db.bootstrap import ensure_market_schema
from app.db.session import AsyncSessionLocal, engine
from app.services.market_levels import recompute_market_levels
from app.services.market_scoring import ensure_default_weights, recompute_all_seller_scores
from starlette.middleware.sessions import SessionMiddleware
from pydantic import BaseModel

class Item(BaseModel):
    name: str
    price: float
    is_offer: bool | None = None

app = FastAPI(title=settings.PROJECT_NAME)

cors_allowed_origins = [
    origin.strip()
    for origin in settings.CORS_ALLOWED_ORIGINS.split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SessionMiddleware, secret_key=settings.SESSION_SECRET)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(listings.router, prefix="/listings", tags=["listings"])
app.include_router(gigs.router, prefix="/gigs", tags=["gigs"])
app.include_router(tracking.router, prefix="/track", tags=["tracking"])
app.include_router(orders.router, prefix="/orders", tags=["orders"])
app.include_router(payments.router, prefix="/payments", tags=["payments"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(categories.router, prefix="/categories", tags=["categories"])
app.include_router(verification.router, prefix="/verify", tags=["verification"])
app.include_router(insights.router, prefix="/insights", tags=["insights"])
app.include_router(roles.router, prefix="/roles", tags=["roles"])
# Phase 3 — Communication & Trust
app.include_router(reviews.router)
app.include_router(chat.router, prefix="/chat")
app.include_router(disputes.router)
app.include_router(kyc.router)
app.include_router(sellers.router, prefix="/sellers", tags=["sellers"])
app.include_router(score.router)


async def _run_market_level_job() -> None:
    async with AsyncSessionLocal() as db:
        await recompute_market_levels(db)
        await recompute_all_seller_scores(db)


async def _market_level_scheduler() -> None:
    while True:
        await asyncio.sleep(6 * 60 * 60)
        with suppress(Exception):
            await _run_market_level_job()


@app.on_event("startup")
async def startup_tasks() -> None:
    await ensure_market_schema(engine)
    async with AsyncSessionLocal() as db:
        await ensure_default_weights(db)
    with suppress(Exception):
        await _run_market_level_job()
    app.state.market_level_task = asyncio.create_task(_market_level_scheduler())


@app.on_event("shutdown")
async def shutdown_tasks() -> None:
    task = getattr(app.state, "market_level_task", None)
    if task:
        task.cancel()
        with suppress(asyncio.CancelledError):
            await task

@app.get("/")
def read_root():
    return {"Hello": "World"}

@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}

@app.put("/items/{item_id}")
def update_item(item_id: int, item: Item):
    return {"item_name": item.name, "item_id": item_id}
