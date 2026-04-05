from fastapi import Request, HTTPException, Response
from starlette.middleware.base import BaseHTTPMiddleware
from app.models.models import User
from app.db.session import SessionLocal
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)

class AdminSecurityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 1. Identity Check (Admin routes only)
        if request.url.path.startswith("/api/v1/admin"):
            user_id = request.state.user_id if hasattr(request.state, "user_id") else None
            
            if not user_id:
                # Middleware might run before dependencies, we need a reliable way or trust the router
                # However, for IP whitelisting, we need to check BEFORE the route executes.
                pass 

            async with SessionLocal() as db:
                # Since we don't have the user object yet (depends run later), 
                # we need to extract from headers/cookies manually or rely on session
                token = request.cookies.get("access_token")
                if token:
                    from app.auth.tokens import decode_access_token
                    try:
                        payload = decode_access_token(token)
                        uid = str(payload.get("sub")).replace("-", "")
                        
                        result = await db.execute(select(User).where(User.id == uid))
                        user = result.scalar_one_or_none()
                        
                        if user and user.role == "admin":
                            client_ip = request.client.host
                            
                            # 2. IP Whitelisting
                            if user.ip_whitelist:
                                if client_ip not in user.ip_whitelist:
                                    logger.warning(f"Admin Access Denied: IP {client_ip} not whitelisted for user {uid}")
                                    return Response(content="IP Not Whitelisted", status_code=403)
                            
                            # 3. 2FA Enforcement
                            if user.two_fa_enabled and request.session.get("2fa_verified") != str(user.id):
                                # Skip redirect if already on verification page or static/api routes for verify
                                if "/admin/verify-2fa" not in request.url.path and "/api/v1/auth/2fa/verify" not in request.url.path:
                                    logger.info(f"Admin 2FA Required for user {uid}")
                                    return Response(content="2FA Required", status_code=403)

                    except Exception as e:
                        logger.error(f"Admin Security Middleware Error: {e}")

        response = await call_next(request)
        return response
