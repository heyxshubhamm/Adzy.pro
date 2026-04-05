from celery import Celery
import asyncio, os
from datetime import datetime, timedelta
from sqlalchemy import select
from app.db.session import AsyncSessionLocal
from app.models.models import AutomationRule, Order, User

celery = Celery("marketplace", broker=os.getenv("REDIS_URL", "redis://localhost:6379/0"))

@celery.task(name="celery_tasks.automation_runner.run_automation_check")
def run_automation_check():
    """Runs every 15 minutes via Celery beat."""
    asyncio.run(_check_automations())

async def _check_automations():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(AutomationRule).where(AutomationRule.is_active == True)
        )
        for rule in result.scalars().all():
            await _execute_rule(rule, db)

async def _execute_rule(rule: AutomationRule, db):
    event     = rule.trigger.get("event")
    condition = rule.trigger.get("condition", {})
    action    = rule.action

    if event == "order.disputed":
        hours = condition.get("hours_open", 48)
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        orders = await db.execute(
            select(Order).where(
                Order.status     == "DISPUTED",
                Order.updated_at <= cutoff,
            )
        )
        for order in orders.scalars().all():
            await _dispatch_action(action, {"order_id": str(order.id)}, db)

    elif event == "seller.inactive":
        days = condition.get("days", 30)
        cutoff = datetime.utcnow() - timedelta(days=days)
        sellers = await db.execute(
            select(User).where(
                User.role == "seller",
                User.updated_at <= cutoff,
            )
        )
        for seller in sellers.scalars().all():
            await _dispatch_action(action, {"user_id": str(seller.id)}, db)

    rule.run_count  += 1
    rule.last_run_at = datetime.utcnow()
    await db.commit()

async def _dispatch_action(action: dict, ctx: dict, db):
    atype = action.get("type")
    if atype == "notify_admin":
        print(f"[Automation] NOTIFY ADMIN: {action.get('template')} for {ctx}")
    elif atype == "force_order_status":
        order = await db.get(Order, ctx.get("order_id"))
        if order: 
            order.status = action.get("status")
            print(f"[Automation] Forced order {order.id} status to {order.status}")
