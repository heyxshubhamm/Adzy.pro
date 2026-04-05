import strawberry
from typing import List, Optional
from strawberry.types import Info
from sqlalchemy import select
from ..db.session import async_session_factory
from ..models.models import MarketplaceUser, Gig, FraudAlert

@strawberry.type
class UserType:
    id: str
    username: str
    email: str
    is_seller: bool
    is_banned: bool
    risk_score: float
    trust_score: float
    kyc_verified: bool
    wallet_balance: float
    wallet_frozen: bool
    country: str

@strawberry.type
class GigType:
    id: str
    title: str
    category: str
    price: float
    status: str
    nsfw_score: float
    spam_score: float
    quality_score: float

@strawberry.type
class FraudAlertType:
    id: str
    alert_type: str
    severity: int
    resolved: bool
    ip_address: Optional[str]

@strawberry.type
class Query:
    @strawberry.field
    async def users(
        self, info: Info, 
        is_banned: Optional[bool] = None,
        kyc_verified: Optional[bool] = None,
        min_risk: Optional[float] = None
    ) -> List[UserType]:
        async with async_session_factory() as session:
            stmt = select(MarketplaceUser)
            if is_banned is not None:
                stmt = stmt.where(MarketplaceUser.is_banned == is_banned)
            if kyc_verified is not None:
                stmt = stmt.where(MarketplaceUser.kyc_verified == kyc_verified)
            if min_risk is not None:
                stmt = stmt.where(MarketplaceUser.risk_score >= min_risk)
            
            result = await session.execute(stmt)
            users = result.scalars().all()
            return [UserType(
                id=str(u.id), username=u.username, email=u.email,
                is_seller=u.is_seller, is_banned=u.is_banned,
                risk_score=u.risk_score, trust_score=u.trust_score,
                kyc_verified=u.kyc_verified, wallet_balance=u.wallet_balance,
                wallet_frozen=u.wallet_frozen, country=u.country or "Unknown"
            ) for u in users]

    @strawberry.field
    async def gigs(self, info: Info, status: Optional[str] = None) -> List[GigType]:
        async with async_session_factory() as session:
            stmt = select(Gig)
            if status:
                stmt = stmt.where(Gig.status == status)
            result = await session.execute(stmt)
            gigs = result.scalars().all()
            return [GigType(
                id=str(g.id), title=g.title, category=g.category,
                price=g.price, status=g.status, nsfw_score=g.nsfw_score,
                spam_score=g.spam_score, quality_score=g.quality_score
            ) for g in gigs]

schema = strawberry.Schema(query=Query)
