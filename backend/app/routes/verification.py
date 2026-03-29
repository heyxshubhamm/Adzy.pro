from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db, AsyncSessionLocal
from app.models.models import Order
from app.services.claude_service import claude_service
from pydantic import BaseModel
import uuid

router = APIRouter()

class ProofSubmission(BaseModel):
    proof_url: str

async def process_verification(order_id: uuid.UUID, db_factory):
    async with db_factory() as db:
        result = await db.execute(select(Order).where(Order.id == order_id))
        order = result.scalar_one_or_none()
        if not order:
            return
        
        # Target URL is what the buyer wanted the link to point to
        # In this MVP, target_url is stored on the Order row
        verification_result = await claude_service.verify_placement(order.proof_url, getattr(order, 'target_url', ''))
        
        order.verification_status = verification_result["status"]
        order.ai_verification_report = verification_result["report"]
        
        if verification_result["status"] == "VERIFIED":
            order.status = "COMPLETED"
            
        await db.commit()

@router.post("/{order_id}/submit-proof")
async def submit_proof(
    order_id: uuid.UUID,
    proof: ProofSubmission,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.proof_url = proof.proof_url
    order.verification_status = "PENDING"
    await db.commit()
    
    background_tasks.add_task(process_verification, order_id, AsyncSessionLocal)
    
    return {"message": "Proof submitted. AI verification in progress.", "status": "PENDING"}
