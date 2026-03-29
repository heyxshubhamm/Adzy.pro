from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.core.dependencies import get_current_user, require_seller
from app.auth.tokens import create_token_pair
from app.auth.token_store import save_refresh_token
from app.auth.cookies import set_auth_cookies
from app.models.models import User, SellerProfile
from app.schemas.schemas import SellerOnboardingIn, SellerProfileOut

router = APIRouter()

@router.post("/become-seller", status_code=200)
async def become_seller(
    body: SellerOnboardingIn,
    response: Response,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if user.role == "seller":
        raise HTTPException(status_code=400, detail="Already a seller")

    # Check for existing profile
    result = await db.execute(select(SellerProfile).where(SellerProfile.user_id == user.id))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Seller profile already exists")

    # Create seller profile
    profile = SellerProfile(
        user_id=user.id,
        display_name=body.display_name,
        bio=body.bio,
        skills=body.skills,
        languages=body.languages,
        country=body.country,
        response_time=body.response_time,
    )
    db.add(profile)

    # Promote user
    user.role = "seller"
    await db.commit()

    # Re-issue Intelligence Identity (Rotation)
    tokens = create_token_pair(str(user.id), user.role, user.email)
    await save_refresh_token(str(user.id), tokens.refresh_token)
    set_auth_cookies(response, tokens.access_token, tokens.refresh_token)

    return {"message": "System enrollment successful!", "role": "seller"}

@router.get("/seller/{user_id}", response_model=SellerProfileOut)
async def get_seller_profile(user_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SellerProfile).where(SellerProfile.user_id == user_id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Seller profile not found")
    return profile

@router.patch("/seller/me", response_model=SellerProfileOut)
async def update_seller_profile(
    body: SellerOnboardingIn,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SellerProfile).where(SellerProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="No seller profile found")

    for field, value in body.dict(exclude_unset=True).items():
        setattr(profile, field, value)

    await db.commit()
    await db.refresh(profile)
    return profile

@router.patch("/seller/me/availability")
async def toggle_availability(
    is_available: bool,
    user: User = Depends(require_seller),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SellerProfile).where(SellerProfile.user_id == user.id))
    profile = result.scalar_one_or_none()
    profile.is_available = is_available
    await db.commit()
    return {"is_available": is_available}
