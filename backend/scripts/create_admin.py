import asyncio, sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import AsyncSessionLocal
from app.models.models import User
from sqlalchemy import select
from passlib.context import CryptContext

pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_admin(email: str, username: str, password: str):
    async with AsyncSessionLocal() as db:
        existing = await db.execute(select(User).where(User.email == email))
        if existing.scalar_one_or_none():
            # Promote existing user
            user = await db.scalar(select(User).where(User.email == email))
            user.role        = "admin"
            user.is_verified = True
            await db.commit()
            print(f"✓ Promoted {email} to admin")
            return

        user = User(
            email           = email,
            username        = username,
            hashed_password = pwd_ctx.hash(password),
            role            = "admin",
            is_verified     = True,
            is_active       = True,
        )
        db.add(user)
        await db.commit()
        print(f"✓ Admin created: {email} / {password}")

if __name__ == "__main__":
    asyncio.run(create_admin(
        email    = os.getenv("ADMIN_EMAIL",    "admin@marketplace.com"),
        username = os.getenv("ADMIN_USERNAME", "admin"),
        password = os.getenv("ADMIN_PASSWORD", "Admin@123456"),
    ))
