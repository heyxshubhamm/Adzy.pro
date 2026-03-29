import hashlib, hmac, secrets, os
from .token_store import redis_client

# Layer 4: Verification Loop (HMAC-Signed Tokens)
TOKEN_SECRET  = os.getenv("SECRET_KEY", "adzy_core_v1_legacy_key")
TOKEN_TTL     = int(os.getenv("VERIFICATION_TOKEN_EXPIRE_HOURS", 24)) * 3600
COOLDOWN_TTL  = int(os.getenv("RESEND_COOLDOWN_MINUTES", 2)) * 60

def _sign_token(raw: str) -> str:
    """HMAC-SHA256 signing to authenticate the verification raw token."""
    return hmac.new(TOKEN_SECRET.encode(), raw.encode(), hashlib.sha256).hexdigest()

def generate_verification_token() -> tuple[str, str]:
    """Generates a cryptographically strong, HMAC-signed verification pair."""
    raw    = secrets.token_urlsafe(32)
    signed = _sign_token(raw)
    return raw, signed

async def store_verification_token(user_id: str, signed_hash: str) -> None:
    """Stores the signed verification authority in Redis with a 24-hour TTL."""
    await redis_client.setex(f"verify:{user_id}", TOKEN_TTL, signed_hash)

async def validate_verification_token(user_id: str, raw_token: str) -> bool:
    """Verifies the raw token against the signed authority in Redis to activate the session."""
    stored = await redis_client.get(f"verify:{user_id}")
    if not stored:
        return False
    expected = _sign_token(raw_token)
    return hmac.compare_digest(stored.decode(), expected)

async def consume_verification_token(user_id: str) -> None:
    """Terminates the verification window after successful activation."""
    await redis_client.delete(f"verify:{user_id}")

async def can_resend(user_id: str) -> bool:
    """Enforces a 2-minute cooldown to ensure the platform's transactional stability."""
    return not bool(await redis_client.exists(f"verify_cooldown:{user_id}"))

async def set_resend_cooldown(user_id: str) -> None:
    """Invokes the resend-cooldown lock in Redis to prevent email flooding."""
    await redis_client.setex(f"verify_cooldown:{user_id}", COOLDOWN_TTL, "1")

def _normalize_email(email: str) -> str:
    return email.strip().lower()

def _email_fingerprint(email: str) -> str:
    return hashlib.sha256(_normalize_email(email).encode()).hexdigest()

def _ip_fingerprint(ip: str) -> str:
    return hashlib.sha256(ip.encode()).hexdigest()

async def can_resend_email(email: str) -> bool:
    key = f"verify_cooldown_email:{_email_fingerprint(email)}"
    return not bool(await redis_client.exists(key))

async def set_resend_cooldown_email(email: str) -> None:
    key = f"verify_cooldown_email:{_email_fingerprint(email)}"
    await redis_client.setex(key, COOLDOWN_TTL, "1")

async def can_resend_ip(ip: str) -> bool:
    key = f"verify_cooldown_ip:{_ip_fingerprint(ip)}"
    return not bool(await redis_client.exists(key))

async def set_resend_cooldown_ip(ip: str) -> None:
    key = f"verify_cooldown_ip:{_ip_fingerprint(ip)}"
    await redis_client.setex(key, COOLDOWN_TTL, "1")
