import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    ENV: str = os.getenv("ENV", "development")
    PROJECT_NAME: str = "Adzy.pro API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "9823479234792374923")
    REFRESH_SECRET_KEY: str = os.getenv("REFRESH_SECRET_KEY", "another-256-bit-secret-for-refresh-tokens")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15 # Short lived
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7 # Long lived
    
    # Email Verification
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "re_xxxxxxxxxxxx")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@yourdomain.com")
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:3000")
    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", "http://localhost:3000")
    COOKIE_DOMAIN: str = os.getenv("COOKIE_DOMAIN", "")
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_HOURS", 24))
    RESEND_COOLDOWN_MINUTES: int = int(os.getenv("RESEND_COOLDOWN_MINUTES", 2))
    
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./adzy.db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost")
    
    # OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    SESSION_SECRET: str = os.getenv("SESSION_SECRET", "super-secret-session-key")
    
    # Razorpay
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "")
    RAZORPAY_WEBHOOK_SECRET: str = os.getenv("RAZORPAY_WEBHOOK_SECRET", "")
    
    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = os.getenv("CLOUDINARY_CLOUD_NAME", "")
    CLOUDINARY_API_KEY: str = os.getenv("CLOUDINARY_API_KEY", "")
    CLOUDINARY_API_SECRET: str = os.getenv("CLOUDINARY_API_SECRET", "")
    
    # Anthropic Claude / OpenRouter
    ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    CLAUDE_MODEL: str = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-20241022")
    
    # AWS / S3
    AWS_REGION: str = os.getenv("AWS_REGION", "ap-south-1")
    AWS_ACCESS_KEY_ID: str = os.getenv("AWS_ACCESS_KEY_ID", "")
    AWS_SECRET_ACCESS_KEY: str = os.getenv("AWS_SECRET_ACCESS_KEY", "")
    S3_BUCKET_NAME: str = os.getenv("S3_BUCKET_NAME", "adzy-gigs")
    CDN_BASE_URL: str = os.getenv("CDN_BASE_URL", "https://cdn.adzy.pro")
    S3_RAW_PREFIX: str = os.getenv("S3_RAW_PREFIX", "raw/")
    S3_PROCESSED_PREFIX: str = os.getenv("S3_PROCESSED_PREFIX", "gigs/")
    PRESIGN_EXPIRY_SECONDS: int = int(os.getenv("PRESIGN_EXPIRY_SECONDS", 300))
    MAX_IMAGE_MB: int = int(os.getenv("MAX_IMAGE_MB", 10))
    MAX_VIDEO_MB: int = int(os.getenv("MAX_VIDEO_MB", 100))
    NEW_SCORING_TRAFFIC_PCT: int = int(os.getenv("NEW_SCORING_TRAFFIC_PCT", 5))

    class Config:
        case_sensitive = True

settings = Settings()
