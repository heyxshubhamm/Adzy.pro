from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, cast, String, func
from app.db.session import get_db
from app.auth.tokens import decode_access_token
from app.auth.token_store import is_access_token_blacklisted
from app.models.models import User
from datetime import datetime, timezone

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User:
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = decode_access_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Session expired")

    # Check blacklist (invalidates logout tokens)
    jti = payload.get("jti")
    if jti and await is_access_token_blacklisted(jti):
        raise HTTPException(status_code=401, detail="Token revoked")

    user_id_clean = str(payload["sub"]).replace("-", "")
    result = await db.execute(
        select(User).where(cast(User.id, String) == user_id_clean)
    )
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    
    # High-Risk Blockade: Intercept users with risk_score > 80
    if hasattr(user, "risk_score") and user.risk_score and user.risk_score > 80:
        raise HTTPException(
            status_code=403, 
            detail="Account restricted due to high risk signature. Contact support."
        )

    # Intelligence Sync: Update last active
    user.last_active_at = datetime.now(timezone.utc)
    
    # Enhanced State Tracking
    request.state.user_id      = str(user.id)
    request.state.user_role    = user.role
    request.state.risk_score   = getattr(user, "risk_score", 0)
    request.state.kyc_verified = getattr(user, "kyc_verified", False)
    
    await db.commit()
    return user


async def get_current_user_optional(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    token = request.cookies.get("access_token")
    if not token:
        return None

    try:
        payload = decode_access_token(token)
    except ValueError:
        return None

    jti = payload.get("jti")
    if jti and await is_access_token_blacklisted(jti):
        return None

    user_id_clean = str(payload["sub"]).replace("-", "")
    result = await db.execute(
        select(User).where(cast(User.id, String) == user_id_clean)
    )
    return result.scalar_one_or_none()

def require_role(*roles: str):
    """
    Require one of the given roles OR admin (admin always passes).
    """
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role == "admin":
            return user   # admin always passes every role check
        if user.role not in roles:
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required: {list(roles)}, your role: {user.role}"
            )
        return user
    return checker

async def require_admin(user: User = Depends(get_current_user)) -> User:
    """Strictly admin only — no role fallthrough."""
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# Shortcuts
require_buyer = require_role("buyer", "seller")
require_seller = require_role("seller")
