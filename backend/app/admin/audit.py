from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request
from app.models.models import AuditLog

async def log_action(
    db:          AsyncSession,
    admin_id:    str,
    action:      str,     # "user.ban" | "config.update" | "order.force" etc
    target_type: str,
    target_id:   str,
    old_value:   any = None,
    new_value:   any = None,
    request:     Request = None,
):
    db.add(AuditLog(
        admin_id    = admin_id,
        action      = action,
        target_type = target_type,
        target_id   = str(target_id),
        old_value   = old_value,
        new_value   = new_value,
        ip_address  = request.client.host if request and request.client else None,
    ))
    # Don't commit here — let the caller commit their full transaction
