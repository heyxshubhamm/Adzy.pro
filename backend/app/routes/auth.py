from fastapi import APIRouter, Depends, HTTPException, Response, Cookie, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, EmailStr
from app.schemas.schemas import UserCreate
from app.db.session import get_db
from app.models.models import User, OAuthAccount
from app.auth.tokens import create_token_pair, decode_refresh_token, decode_access_token
from app.auth.token_store import save_refresh_token, validate_refresh_token, revoke_refresh_token, blacklist_access_token
from app.auth.cookies import set_auth_cookies, clear_auth_cookies
from app.auth.verification import (
    generate_verification_token, store_verification_token,
    validate_verification_token, consume_verification_token,
    can_resend, set_resend_cooldown,
    can_resend_email, set_resend_cooldown_email,
    can_resend_ip, set_resend_cooldown_ip,
)
from app.auth.email import send_verification_email, send_welcome_email
from app.core.dependencies import get_current_user
from app.core.config import settings
from passlib.context import CryptContext
from app.cache.rate_limit import login_limiter, register_limiter
from authlib.integrations.starlette_client import OAuth
from fastapi.responses import RedirectResponse
from fastapi import Query
from datetime import datetime, timezone

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ResendVerificationIn(BaseModel):
    email: EmailStr | None = None

@router.post("/register", status_code=201)
async def register(body: UserCreate, db: AsyncSession = Depends(get_db), _rl: None = Depends(register_limiter)):
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        username=body.username,
        hashed_password=pwd_ctx.hash(body.password),
        is_verified=False
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _send_verification(user)
    return {"message": "Account created. Check your email to verify."}

@router.post("/login")
async def login(body: LoginIn, response: Response, db: AsyncSession = Depends(get_db), _rl: None = Depends(login_limiter)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not pwd_ctx.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail={
                "code": "EMAIL_NOT_VERIFIED",
                "message": "Please verify your email before logging in",
                "user_id": str(user.id),
            }
        )

    tokens = create_token_pair(str(user.id), user.role, user.email)
    await save_refresh_token(str(user.id), tokens.refresh_token)
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)

    return {"user": {"id": str(user.id), "email": user.email, "role": user.role}}

@router.post("/refresh")
async def refresh(
    response: Response,
    refresh_token: str | None = Cookie(None, alias="refresh_token"),
    db: AsyncSession = Depends(get_db),
):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    try:
        payload = decode_refresh_token(refresh_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = payload["sub"]
    if not await validate_refresh_token(user_id, refresh_token):
        await revoke_refresh_token(user_id) # Reuse detected!
        raise HTTPException(status_code=401, detail="Invalid session. Please log in again.")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Rotation: issue new pair
    new_tokens = create_token_pair(str(user.id), user.role, user.email)
    await save_refresh_token(str(user.id), new_tokens.refresh_token)
    set_auth_cookies(response, new_tokens.access_token, new_tokens.refresh_token)

    return {"message": "Tokens refreshed"}

@router.post("/logout")
async def logout(
    response: Response,
    refresh_token: str | None = Cookie(None, alias="refresh_token"),
    access_token: str | None = Cookie(None, alias="access_token"),
):
    if access_token:
        try:
            payload = decode_access_token(access_token)
            jti = payload.get("jti")
            exp = payload.get("exp", 0)
            remaining_ttl = max(0, int(exp - datetime.now(timezone.utc).timestamp()))
            if jti and remaining_ttl > 0:
                await blacklist_access_token(jti, remaining_ttl)
        except ValueError:
            pass

    if refresh_token:
        try:
            payload = decode_refresh_token(refresh_token)
            await revoke_refresh_token(payload["sub"])
        except ValueError:
            pass

    clear_auth_cookies(response)
    return {"message": "Logged out"}

@router.get("/me")
async def me(access_token: str | None = Cookie(None), db: AsyncSession = Depends(get_db)):
    if not access_token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = decode_access_token(access_token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Session expired")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {"id": str(user.id), "email": user.email, "role": user.role, "avatar_url": user.avatar_url}

# Verification Logic Helpers
async def _send_verification(user: User):
    raw_token, signed_hash = generate_verification_token()
    await store_verification_token(str(user.id), signed_hash)
    await send_verification_email(user.email, user.username, raw_token, str(user.id))

@router.get("/verify-email")
async def verify_email(
    token: str = Query(...),
    user_id: str = Query(...),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=400, detail="Invalid verification link")
    if user.is_verified:
        return {"message": "Email already verified", "already_verified": True}

    if not await validate_verification_token(user_id, token):
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")

    user.is_verified = True
    await db.commit()
    await consume_verification_token(user_id)
    await send_welcome_email(user.email, user.username)

    return {"message": "Email verified successfully"}

@router.post("/resend-verification")
async def resend_verification(
    request: Request,
    body: ResendVerificationIn | None = None,
    db: AsyncSession = Depends(get_db),
):
    ip = request.client.host if request.client else "unknown"
    if not await can_resend_ip(ip):
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {settings.RESEND_COOLDOWN_MINUTES} minutes before requesting another email",
        )

    user: User | None = None

    token = request.cookies.get("access_token")
    if token:
        try:
            payload = decode_access_token(token)
            result = await db.execute(select(User).where(User.id == payload["sub"]))
            user = result.scalar_one_or_none()
        except ValueError:
            user = None

    if user is None and body and body.email:
        result = await db.execute(select(User).where(User.email == body.email.strip().lower()))
        user = result.scalar_one_or_none()

    # Always return generic success when account doesn't exist to avoid enumeration.
    if user is None:
        await set_resend_cooldown_ip(ip)
        return {"message": "If this email exists, a verification email has been sent"}

    if user.is_verified:
        raise HTTPException(status_code=400, detail="Email is already verified")

    if not await can_resend(str(user.id)) or not await can_resend_email(user.email):
        raise HTTPException(
            status_code=429,
            detail=f"Please wait {settings.RESEND_COOLDOWN_MINUTES} minutes before requesting another email",
        )

    await set_resend_cooldown(str(user.id))
    await set_resend_cooldown_email(user.email)
    await set_resend_cooldown_ip(ip)
    await _send_verification(user)
    return {"message": "Verification email sent"}

class ChangeEmailIn(BaseModel):
    new_email: EmailStr
    password: str

@router.post("/change-email")
async def change_email(
    body: ChangeEmailIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not pwd_ctx.verify(body.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    existing = await db.execute(select(User).where(User.email == body.new_email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already in use")

    user.email = body.new_email
    user.is_verified = False # Reset verification
    await db.commit()
    await _send_verification(user)
    return {"message": "Verification email sent to your new address"}

# Google OAuth
@router.get("/google")
async def google_login(request: Request):
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, response: Response, db: AsyncSession = Depends(get_db)):
    token = await oauth.google.authorize_access_token(request)
    userinfo = token.get("userinfo")
    if not userinfo:
        raise HTTPException(400, "OAuth error")

    result = await db.execute(select(User).where(User.email == userinfo["email"]))
    user = result.scalar_one_or_none()

    if not user:
        user = User(
            email=userinfo["email"],
            username=userinfo["email"].split("@")[0],
            avatar_url=userinfo.get("picture"),
            is_verified=True,
            role="buyer"
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)

    tokens = create_token_pair(str(user.id), user.role, user.email)
    await save_refresh_token(str(user.id), tokens.refresh_token)
    
    # We use a RedirectResponse for OAuth
    resp = RedirectResponse(url="/dashboard")
    set_auth_cookies(resp, tokens.access_token, tokens.refresh_token)
    return resp
