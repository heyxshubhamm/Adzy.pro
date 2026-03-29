"""
Per-order WebSocket chat between buyer and seller.

Connect: WS /chat/orders/{order_id}?token=<access_token>
REST fallback: GET /chat/orders/{order_id}/messages
              POST /chat/orders/{order_id}/messages
"""
import json
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Dict
from datetime import datetime

from app.db.session import get_db, AsyncSessionLocal
from app.core.dependencies import get_current_user
from app.models.models import User, Order, Message
from app.core.config import settings
from jose import jwt, JWTError

router = APIRouter(tags=["chat"])


# ── Connection manager ────────────────────────────────────────────────────────

class ConnectionManager:
    def __init__(self):
        # order_id → list of websockets
        self._rooms: Dict[str, List[WebSocket]] = {}

    async def connect(self, ws: WebSocket, order_id: str):
        await ws.accept()
        self._rooms.setdefault(order_id, []).append(ws)

    def disconnect(self, ws: WebSocket, order_id: str):
        room = self._rooms.get(order_id, [])
        if ws in room:
            room.remove(ws)

    async def broadcast(self, order_id: str, data: dict, exclude: WebSocket | None = None):
        for ws in list(self._rooms.get(order_id, [])):
            if ws is exclude:
                continue
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


# ── Auth helper for WebSocket ─────────────────────────────────────────────────

async def _ws_auth(token: str, db: AsyncSession) -> User | None:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        username: str = payload.get("sub")
        if not username:
            return None
        result = await db.execute(select(User).where(User.username == username))
        return result.scalar_one_or_none()
    except JWTError:
        return None


# ── WebSocket endpoint ────────────────────────────────────────────────────────

@router.websocket("/orders/{order_id}")
async def order_chat_ws(
    order_id: str,
    ws: WebSocket,
    token: str = Query(...),
):
    async with AsyncSessionLocal() as db:
        user = await _ws_auth(token, db)
        if not user:
            await ws.close(code=4001)
            return

        # Verify access to this order
        result = await db.execute(
            select(Order).where(Order.id == order_id)
            .options(selectinload(Order.gig))
        )
        order = result.scalar_one_or_none()
        if not order:
            await ws.close(code=4004)
            return

        gig_seller_id = str(order.gig.seller_id) if order.gig else None
        if str(order.buyer_id) != str(user.id) and gig_seller_id != str(user.id):
            await ws.close(code=4003)
            return

    await manager.connect(ws, order_id)
    try:
        while True:
            raw = await ws.receive_text()
            try:
                data = json.loads(raw)
                body = str(data.get("body", "")).strip()
            except (json.JSONDecodeError, AttributeError):
                continue

            if not body:
                continue

            async with AsyncSessionLocal() as db:
                msg = Message(order_id=order_id, sender_id=user.id, body=body)
                db.add(msg)
                await db.commit()
                await db.refresh(msg)

                payload = {
                    "id": str(msg.id),
                    "sender_id": str(msg.sender_id),
                    "sender_username": user.username,
                    "body": msg.body,
                    "created_at": msg.created_at.isoformat(),
                }

            await manager.broadcast(order_id, payload)

    except WebSocketDisconnect:
        manager.disconnect(ws, order_id)


# ── REST endpoints ────────────────────────────────────────────────────────────

class MessageIn(BaseModel):
    body: str


@router.get("/orders/{order_id}/messages", response_model=List[dict])
async def get_messages(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.id == order_id)
        .options(selectinload(Order.gig))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    gig_seller_id = str(order.gig.seller_id) if order.gig else None
    if str(order.buyer_id) != str(user.id) and gig_seller_id != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    msgs_result = await db.execute(
        select(Message)
        .where(Message.order_id == order_id)
        .options(selectinload(Message.sender))
        .order_by(Message.created_at.asc())
    )
    messages = msgs_result.scalars().all()

    # Mark messages from the other party as read
    await db.execute(
        update(Message)
        .where(Message.order_id == order_id, Message.sender_id != user.id, Message.is_read == False)
        .values(is_read=True)
    )
    await db.commit()

    return [
        {
            "id": str(m.id),
            "sender_id": str(m.sender_id),
            "sender_username": m.sender.username if m.sender else None,
            "body": m.body,
            "is_read": m.is_read,
            "created_at": m.created_at.isoformat(),
            "is_mine": str(m.sender_id) == str(user.id),
        }
        for m in messages
    ]


@router.post("/orders/{order_id}/messages", response_model=dict, status_code=201)
async def send_message(
    order_id: str,
    body: MessageIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Order).where(Order.id == order_id)
        .options(selectinload(Order.gig))
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    gig_seller_id = str(order.gig.seller_id) if order.gig else None
    if str(order.buyer_id) != str(user.id) and gig_seller_id != str(user.id):
        raise HTTPException(status_code=403, detail="Access denied")

    if not body.body.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = Message(order_id=order_id, sender_id=user.id, body=body.body.strip())
    db.add(msg)
    await db.commit()
    await db.refresh(msg)

    out = {
        "id": str(msg.id),
        "sender_id": str(msg.sender_id),
        "sender_username": user.username,
        "body": msg.body,
        "is_read": False,
        "created_at": msg.created_at.isoformat(),
        "is_mine": True,
    }

    # Push to any connected WebSocket clients
    await manager.broadcast(order_id, out)
    return out


@router.get("/orders/{order_id}/unread-count", response_model=dict)
async def unread_count(
    order_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import func
    result = await db.execute(
        select(func.count(Message.id))
        .where(
            Message.order_id == order_id,
            Message.sender_id != user.id,
            Message.is_read == False,
        )
    )
    return {"unread": result.scalar() or 0}
