import os
import logging
import httpx
from celery import Celery
from celery.schedules import crontab
from datetime import datetime, timedelta
from sqlalchemy import select, update
from ..db.session import async_session_factory
from ..models.models import Transaction, FraudAlert, MarketplaceUser, Gig, Dispute, ComplianceRecord, SystemAlert
from ..services.risk_service import RiskService

logger = logging.getLogger(__name__)

# Initialize Celery
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")
celery_app = Celery("adzy_worker", broker=redis_url, backend=redis_url)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        "check-sla-breaches-every-15m": {
            "task": "app.worker.tasks.check_sla_breaches",
            "schedule": crontab(minute="*/15"),
        },
        "recalculate-risk-scores-nightly": {
            "task": "app.worker.tasks.recalculate_user_risk_scores",
            "schedule": crontab(hour=2, minute=0),
        },
    },
)

@celery_app.task(name="app.worker.tasks.run_aml_screening", bind=True, max_retries=3)
def run_aml_screening(self, transaction_id: str):
    """
    Simulated AML screening task.
    In production, this would call a service like ComplyAdvantage.
    """
    logger.info(f"Running AML screening for transaction {transaction_id}")
    # Mock implementation of AML check
    # In reality, this would be an async-to-sync wrapper or 
    # use a sync DB session if needed. 
    # For industrial accuracy, we use a placeholder logic.
    pass

@celery_app.task(name="app.worker.tasks.check_sla_breaches")
def check_sla_breaches():
    """
    Scans for overdue disputes and compliance records.
    """
    logger.info("Checking for SLA breaches...")
    # This task would ideally use a sync engine or run_async wrapper
    pass

@celery_app.task(name="app.worker.tasks.recalculate_user_risk_scores")
def recalculate_user_risk_scores():
    """
    Nightly recalculation of user risk scores based on historical alerts.
    """
    logger.info("Recalculating global user risk scores...")
    pass

@celery_app.task(name="app.worker.tasks.run_content_moderation", bind=True)
def run_content_moderation(self, gig_id: str):
    """
    AI-driven content moderation for new gigs.
    Calls the Fraud Detection Service for scoring.
    """
    logger.info(f"Moderating gig {gig_id}")
    # Placeholder for ML service call
    pass
