from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional, List
from app.db.session import get_db
from app.core.dependencies import require_admin
from app.models.models import AutomationRule, User, AuditLog

router = APIRouter(prefix="/admin", tags=["admin-automation"])

class AutomationIn(BaseModel):
    name:       str
    trigger:    dict    # {event, condition}
    action:     dict    # {type, params}
    is_active:  bool = True

@router.get("/automations")
async def list_automations(db=Depends(get_db), _=Depends(require_admin)):
    result = await db.execute(select(AutomationRule).order_by(AutomationRule.created_at))
    return result.scalars().all()

@router.post("/automations", status_code=201)
async def create_automation(body: AutomationIn, db=Depends(get_db), admin: User=Depends(require_admin)):
    rule = AutomationRule(**body.model_dump())
    db.add(rule)
    await db.flush() # get ID

    db.add(AuditLog(
        admin_id=admin.id,
        action="automation.create",
        target_type="automation",
        target_id=str(rule.id),
        new_value=body.model_dump()
    ))

    await db.commit()
    return rule

@router.patch("/automations/{rule_id}")
async def update_automation(rule_id: str, body: AutomationIn, db=Depends(get_db), admin: User=Depends(require_admin)):
    result = await db.execute(select(AutomationRule).where(AutomationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule: raise HTTPException(404, "Rule not found")

    old_val = {f: getattr(rule, f) for f in body.model_dump(exclude_unset=True).keys() if hasattr(rule, f)}
    
    for f, v in body.model_dump(exclude_unset=True).items():
        setattr(rule, f, v)
        
    db.add(AuditLog(
        admin_id=admin.id,
        action="automation.update",
        target_type="automation",
        target_id=rule_id,
        old_value=old_val,
        new_value=body.model_dump(exclude_unset=True)
    ))
    
    await db.commit()
    return rule

@router.delete("/automations/{rule_id}", status_code=204)
async def delete_automation(rule_id: str, db=Depends(get_db), admin: User=Depends(require_admin)):
    result = await db.execute(select(AutomationRule).where(AutomationRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if rule: 
        db.add(AuditLog(
            admin_id=admin.id,
            action="automation.delete",
            target_type="automation",
            target_id=rule_id,
            old_value={"name": rule.name}
        ))
        await db.delete(rule)
        await db.commit()
