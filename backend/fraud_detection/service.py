import os
import json
import logging
import asyncio
from typing import Dict, List, Optional, Tuple

import numpy as np
import joblib
import redis.asyncio as aioredis
from fastapi import FastAPI, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
# Optional: Instrumentator for metrics
try:
    from prometheus_fastapi_instrumentator import Instrumentator
except ImportError:
    Instrumentator = None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fraud_service")

app = FastAPI(title="Adzy Fraud Detection Service", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

if Instrumentator:
    Instrumentator().instrument(app).expose(app)

async def get_redis():
    return await aioredis.from_url(
        os.getenv('REDIS_URL', 'redis://localhost:6379'),
        encoding='utf-8', decode_responses=True,
    )

# --- Models ---

class TransactionData(BaseModel):
    transaction_id:    str
    user_id:           str
    amount:            float
    currency:          str   = 'USD'
    payment_method:    str
    ip_address:        str
    country:           str   = ''
    time_of_day:       float = Field(..., ge=0, le=24)
    device_fingerprint:str   = ''
    is_new_device:     bool  = False
    is_vpn:            bool  = False
    is_tor:            bool  = False
    seller_id:         str   = ''
    gig_category:      str   = ''

class UserBehaviorData(BaseModel):
    user_id:           str
    txn_count_24h:     int   = 0
    txn_count_7d:      int   = 0
    avg_amount_30d:    float = 0.0
    max_amount_30d:    float = 0.0
    countries_30d:     int   = 1
    devices_30d:       int   = 1
    failed_logins_24h: int   = 0
    disputes_90d:      int   = 0
    chargebacks_90d:   int   = 0
    account_age_days:  int   = 0
    kyc_verified:      bool  = False

class FraudRiskResponse(BaseModel):
    transaction_id:      str
    risk_score:          float
    risk_level:          str
    is_fraudulent:       bool
    alerts:              List[str]
    recommended_actions: List[str]
    model_version:       str
    processing_ms:       float

# --- Logic Engines ---

class RuleEngine:
    RULES = [
        ('TOR_EXIT_NODE',      lambda tx, b: tx.is_tor,                            40, 5),
        ('VPN_HIGH_AMOUNT',    lambda tx, b: tx.is_vpn and tx.amount > 1000,       25, 3),
        ('VELOCITY_BURST',     lambda tx, b: b.txn_count_24h > 20,                 30, 4),
        ('EXTREME_VELOCITY',   lambda tx, b: b.txn_count_24h > 50,                 50, 5),
        ('SANCTIONED_COUNTRY', lambda tx, b: tx.country in {'IR','KP','SY','CU'}, 60, 5),
        ('CHARGEBACK_HISTORY', lambda tx, b: b.chargebacks_90d > 2,                35, 4),
        ('NEW_DEVICE_LARGE',   lambda tx, b: tx.is_new_device and tx.amount > 500, 20, 3),
        ('NO_KYC_LARGE',       lambda tx, b: not b.kyc_verified and tx.amount > 2000, 30, 4),
        ('CRYPTO_PAYMENT',     lambda tx, b: tx.payment_method == 'crypto',        15, 2),
        ('MULTI_COUNTRY',      lambda tx, b: b.countries_30d > 5,                  20, 3),
    ]

    @classmethod
    def evaluate(cls, tx: TransactionData, b: UserBehaviorData) -> Tuple[float, List[str], int]:
        total, fired, max_sev = 0.0, [], 1
        for name, cond, risk, sev in cls.RULES:
            try:
                if cond(tx, b):
                    total   += risk
                    max_sev  = max(max_sev, sev)
                    fired.append(name)
            except Exception as e:
                logger.error(f"Rule {name} failed: {e}")
        return min(100.0, total), fired, max_sev

class FraudScoringEngine:
    @classmethod
    def score(cls, tx: TransactionData, b: UserBehaviorData) -> Tuple[float, List[str], List[str]]:
        rule_risk, fired, _  = RuleEngine.evaluate(tx, b)
        # Composite score (ML integration placeholder)
        composite = min(100.0, rule_risk) 
        return round(composite, 2), fired, cls._recommend_actions(composite, fired)

    @classmethod
    def _recommend_actions(cls, score, rules):
        actions = []
        if score >= 80: actions.extend(['BLOCK_TRANSACTION', 'FLAG_AML', 'NOTIFY_COMPLIANCE'])
        elif score >= 60: actions.extend(['HOLD_FOR_REVIEW', 'REQUEST_VERIFICATION'])
        elif score >= 40: actions.extend(['MONITOR_USER', 'STEP_UP_AUTH'])
        else: actions.append('ALLOW')
        return list(set(actions))

    @classmethod
    def classify_risk(cls, score):
        if score >= 80: return 'critical'
        if score >= 60: return 'high'
        if score >= 40: return 'medium'
        return 'low'

# --- Endpoints ---

@app.get('/health')
async def health():
    return {'status': 'ok', 'version': '1.0.0'}

@app.post('/predict/transaction', response_model=FraudRiskResponse)
async def predict_transaction_risk(tx: TransactionData, background_tasks: BackgroundTasks):
    start_time = asyncio.get_event_loop().time() * 1000
    
    # In a real scenario, we'd fetch profile from Redis here
    # For now, we use a default behavior profile
    behavior = UserBehaviorData(user_id=tx.user_id)
    
    risk_score, alerts, actions = FraudScoringEngine.score(tx, behavior)
    
    processing_time = round(asyncio.get_event_loop().time() * 1000 - start_time, 2)
    
    return FraudRiskResponse(
        transaction_id=tx.transaction_id,
        risk_score=risk_score,
        risk_level=FraudScoringEngine.classify_risk(risk_score),
        is_fraudulent=risk_score >= 60.0,
        alerts=alerts,
        recommended_actions=actions,
        model_version="heuristic-v1",
        processing_ms=processing_time
    )

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8001)
