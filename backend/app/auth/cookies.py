from fastapi import Response
import os

# Layer 3: Transport Synchronization (HTTP-Only Cookies)
IS_PROD = os.getenv("ENV", "development") == "production"

def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    """Sets secure, HTTP-only cookies to ensure session persistence without XSS vulnerability."""
    response.set_cookie(
        key      = "access_token",
        value    = access_token,
        httponly = True,
        secure   = IS_PROD,
        samesite = "lax",
        max_age  = 15 * 60,
        path     = "/",
    )
    response.set_cookie(
        key      = "refresh_token",
        value    = refresh_token,
        httponly = True,
        secure   = IS_PROD,
        samesite = "lax",
        max_age  = 7 * 24 * 60 * 60,
        path     = "/auth/refresh",
    )

def clear_auth_cookies(response: Response) -> None:
    """Invokes cookie revocation to terminate the user's identification loop."""
    response.delete_cookie("access_token",  path="/")
    response.delete_cookie("refresh_token", path="/auth/refresh")
