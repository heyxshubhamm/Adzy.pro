"""
Inbox / Message Thread Routes — Standalone Pre-Order Chat

Buyers can message sellers before placing an order ("Contact Seller" flow).
After an order is placed, the same thread continues, now linked to order_id.

Routes:
  POST   /inbox/threads               — start a new conversation (buyer → seller re: gig)
  GET    /inbox/threads               — list my threads (inbox)
  GET    /inbox/threads/{thread_id}   — full thread with messages
  POST   /inbox/threads/{thread_id}/messages  — send a message
  PATCH  /inbox/threads/{thread_id}/read      — mark all as read
  PATCH  /inbox/threads/{thread_id}/archive   — archive thread
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, or_, update
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.models import User, MessageThread, InboxMessage, Gig

router = APIRouter(prefix="/inbox", tags=["inbox"])

# ════════════════════════════════════════════════════════════════════
# SCHEMAS
# ════════════════════════════════════════════════════════════════════

class StartThreadIn(BaseModel):
    seller_id: str
    gig_id:    Optional[str] = None
    subject:   Optional[str] = None
    first_message: str

class SendMessageIn(BaseModel):
    body:           str
    attachment_url: Optional[str] = None

# ════════════════════════════════════════════════════════════════════
# HELPERS
# ════════════════════════════════════════════════════════════════════

def _thread_summary(t: MessageThread, current_user_id) -> dict:
    is_buyer = str(t.buyer_id) == str(current_user_id)
    unread   = t.buyer_unread if is_buyer else t.seller_unread
    other_id = str(t.seller_id) if is_buyer else str(t.buyer_id)
    return {
        "id":           str(t.id),
        "other_user_id": other_id,
        "gig_id":       str(t.gig_id) if t.gig_id else None,
        "order_id":     str(t.order_id) if t.order_id else None,
        "subject":      t.subject,
        "last_message": t.last_message,
        "last_msg_at":  t.last_msg_at,
        "unread":       unread,
        "is_archived":  t.is_archived,
        "created_at":   t.created_at,
    }

# ════════════════════════════════════════════════════════════════════
# ROUTES
# ════════════════════════════════════════════════════════════════════

@router.post("/threads", status_code=201)
async def start_thread(
    body: StartThreadIn,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """
    Buyer starts a conversation with a seller.
    Returns existing thread if one already exists between this buyer-seller pair
    (without an order), to avoid duplicates.
    """
    buyer_id  = user.id
    seller_id = body.seller_id

    if str(buyer_id) == str(seller_id):
        raise HTTPException(400, "You cannot message yourself")

    # Verify seller exists
    seller_result = await db.execute(select(User).where(User.id == seller_id))
    seller = seller_result.scalar_one_or_none()
    if not seller or seller.role not in ("seller", "admin"):
        raise HTTPException(404, "Seller not found")

    # Check for existing thread (pre-order, no order_id)
    existing_result = await db.execute(
        select(MessageThread).where(
            MessageThread.buyer_id  == buyer_id,
            MessageThread.seller_id == seller_id,
            MessageThread.order_id  == None,
        )
    )
    thread = existing_result.scalar_one_or_none()

    if not thread:
        thread = MessageThread(
            buyer_id=buyer_id,
            seller_id=seller_id,
            gig_id=body.gig_id or None,
            subject=body.subject,
            last_message=body.first_message[:120],
            last_msg_at=datetime.now(timezone.utc),
            seller_unread=1,
        )
        db.add(thread)
        await db.flush()

    # Add the first/new message
    msg = InboxMessage(
        thread_id=thread.id,
        sender_id=buyer_id,
        body=body.first_message,
    )
    db.add(msg)

    # Update thread denormalized fields
    thread.last_message = body.first_message[:120]
    thread.last_msg_at  = datetime.now(timezone.utc)
    thread.seller_unread = (thread.seller_unread or 0) + 1

    await db.commit()
    await db.refresh(thread)

    return {"thread_id": str(thread.id), "message": "Thread started"}


@router.get("/threads")
async def list_threads(
    archived: bool = False,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Return all threads where I am a participant (buyer OR seller)."""
    result = await db.execute(
        select(MessageThread)
        .where(
            or_(
                MessageThread.buyer_id  == user.id,
                MessageThread.seller_id == user.id,
            ),
            MessageThread.is_archived == archived,
        )
        .order_by(desc(MessageThread.last_msg_at))
    )
    threads = result.scalars().all()
    return [_thread_summary(t, user.id) for t in threads]


@router.get("/threads/{thread_id}")
async def get_thread(
    thread_id: str,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Get a full thread with all messages."""
    result = await db.execute(
        select(MessageThread).where(MessageThread.id == thread_id)
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(404, "Thread not found")
    if str(thread.buyer_id) != str(user.id) and str(thread.seller_id) != str(user.id):
        raise HTTPException(403, "Access denied")

    msg_result = await db.execute(
        select(InboxMessage)
        .where(InboxMessage.thread_id == thread_id)
        .order_by(InboxMessage.created_at)
    )
    messages = msg_result.scalars().all()

    return {
        **_thread_summary(thread, user.id),
        "messages": [
            {
                "id":             str(m.id),
                "sender_id":      str(m.sender_id),
                "body":           m.body,
                "attachment_url": m.attachment_url,
                "is_read":        m.is_read,
                "created_at":     m.created_at,
            }
            for m in messages
        ],
    }


@router.post("/threads/{thread_id}/messages", status_code=201)
async def send_message(
    thread_id: str,
    body:      SendMessageIn,
    db:        AsyncSession = Depends(get_db),
    user:      User         = Depends(get_current_user),
):
    """Send a message inside an existing thread."""
    result = await db.execute(
        select(MessageThread).where(MessageThread.id == thread_id)
    )
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(404, "Thread not found")

    is_buyer  = str(thread.buyer_id)  == str(user.id)
    is_seller = str(thread.seller_id) == str(user.id)

    if not (is_buyer or is_seller):
        raise HTTPException(403, "Access denied")

    msg = InboxMessage(
        thread_id=thread.id,
        sender_id=user.id,
        body=body.body,
        attachment_url=body.attachment_url,
    )
    db.add(msg)

    # Update thread
    thread.last_message = body.body[:120]
    thread.last_msg_at  = datetime.now(timezone.utc)
    if is_buyer:
        thread.seller_unread = (thread.seller_unread or 0) + 1
    else:
        thread.buyer_unread = (thread.buyer_unread or 0) + 1

    await db.commit()
    await db.refresh(msg)

    return {"id": str(msg.id), "created_at": msg.created_at}


@router.patch("/threads/{thread_id}/read", status_code=204)
async def mark_read(
    thread_id: str,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Mark all messages in a thread as read (from the current user's perspective)."""
    result = await db.execute(select(MessageThread).where(MessageThread.id == thread_id))
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(404, "Thread not found")

    is_buyer = str(thread.buyer_id) == str(user.id)
    if str(thread.buyer_id) != str(user.id) and str(thread.seller_id) != str(user.id):
        raise HTTPException(403, "Access denied")

    # Mark individual messages
    await db.execute(
        update(InboxMessage)
        .where(
            InboxMessage.thread_id == thread_id,
            InboxMessage.sender_id != user.id,
            InboxMessage.is_read == False,
        )
        .values(is_read=True)
    )

    if is_buyer:
        thread.buyer_unread = 0
    else:
        thread.seller_unread = 0

    await db.commit()


@router.patch("/threads/{thread_id}/archive", status_code=204)
async def archive_thread(
    thread_id: str,
    db:   AsyncSession = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Archive (soft-hide) a thread from the inbox."""
    result = await db.execute(select(MessageThread).where(MessageThread.id == thread_id))
    thread = result.scalar_one_or_none()
    if not thread:
        raise HTTPException(404, "Thread not found")
    if str(thread.buyer_id) != str(user.id) and str(thread.seller_id) != str(user.id):
        raise HTTPException(403, "Access denied")
    thread.is_archived = True
    await db.commit()
