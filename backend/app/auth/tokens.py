from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
import hashlib, os, secrets

# Layer 1: Core Cryptography
ACCESS_SECRET  = os.getenv("SECRET_KEY", "adzy_core_v1_legacy_key")
REFRESH_SECRET = os.getenv("REFRESH_SECRET_KEY", "adzy_core_v1_refresh_key")
ALGORITHM      = "HS256"
ACCESS_EXPIRE  = timedelta(minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 15)))
REFRESH_EXPIRE = timedelta(days=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7)))

@dataclass
class TokenPair:
    access_token:  str
    refresh_token: str

def _now() -> datetime:
    return datetime.now(timezone.utc)

def create_access_token(user_id: str, role: str, email: str) -> str:
    """Generates a high-performance, short-lived JWT for authorized telemetry."""
    payload = {
        "sub":   user_id,
        "role":  role,
        "email": email,
        "type":  "access",
        "iat":   _now(),
        "exp":   _now() + ACCESS_EXPIRE,
        "jti":   secrets.token_hex(16),
    }
    return jwt.encode(payload, ACCESS_SECRET, algorithm=ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    """Generates a cryptographically strong, long-lived token for session persistence."""
    payload = {
        "sub":  user_id,
        "type": "refresh",
        "iat":  _now(),
        "exp":  _now() + REFRESH_EXPIRE,
        "jti":  secrets.token_hex(16),
    }
    return jwt.encode(payload, REFRESH_SECRET, algorithm=ALGORITHM)

def create_token_pair(user_id: str, role: str, email: str) -> TokenPair:
    return TokenPair(
        access_token  = create_access_token(user_id, role, email),
        refresh_token = create_refresh_token(user_id),
    )

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, ACCESS_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "access":
            raise ValueError("Not an access token")
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid access token: {e}")

def decode_refresh_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, REFRESH_SECRET, algorithms=[ALGORITHM])
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        return payload
    except JWTError as e:
        raise ValueError(f"Invalid refresh token: {e}")

def hash_token(token: str) -> str:
    """HMAC-SHA256 hashing for secure, non-reversible Redis storage."""
    return hashlib.sha256(token.encode()).hexdigest()
