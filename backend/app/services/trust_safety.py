from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.models import Gig
import os
import json
from app.services.ai_client import get_llm_with_failover

async def evaluate_gig_risk(db: AsyncSession, gig: Gig):
    """
    Automated Trust & Safety NLP Engine.
    Evaluates a gig's content for spam, low-effort slop, and off-platform attempts.
    Calculates a risk_score from 0 (Safe) to 150 (Dangerous).
    """

    system_prompt = """You are the Adzy Trust & Safety NLP Engine. 
You must analyze the seller's gig title, description, and tags for risk.
Look for:
- Requests for off-platform payment (crypto, external links, "email me directly", "pay outside").
- Spam, repeated garbage text, or heavily low-effort AI slop without substance.
- Toxic or malicious topics.

Output ONLY a raw JSON object with:
{"risk_score": integer between 0 and 150, "risk_report": "short string explaining why"}
A score of 0 is perfectly safe. 150 is blatantly violating rules."""

    content = f"Title: {gig.title}\nTags: {gig.tags}\nDescription: {gig.description}"

    response_text = await get_llm_with_failover(system_prompt, content, max_tokens=300)
    
    if response_text:
        try:
            # Parse JSON block
            if "{" in response_text and "}" in response_text:
                json_str = response_text[response_text.find("{"):response_text.rfind("}")+1]
                parsed = json.loads(json_str)
                
                gig.risk_score = float(parsed.get("risk_score", 0))
                gig.risk_report = parsed.get("risk_report", "")
                
                db.add(gig)
                await db.commit()
                return gig.risk_score
        except Exception as e:
            print(f"Trust & Safety parsing failed: {e}")

    return 0.0
