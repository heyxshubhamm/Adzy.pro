from fastapi import Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
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

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Intelligence Sync: Update last active
    user.last_active_at = datetime.now(timezone.utc)
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

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    return result.scalar_one_or_none()

def require_role(*roles: str):
    async def checker(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail=f"Required roles: {roles}")
        return user
    return checker

# Shortcuts
require_buyer = require_role("buyer", "seller", "admin")
require_seller = require_role("seller", "admin")
require_admin = require_role("admin")
