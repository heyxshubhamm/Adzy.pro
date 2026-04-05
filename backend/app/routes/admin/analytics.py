from fastapi import APIRouter, Depends
from ...core.dependencies import require_admin
from ...models.models import User
from ...services.industrial_service import IndustrialService

router = APIRouter(prefix="/admin/analytics", tags=["admin_analytics"])

@router.get("/dashboard")
async def get_admin_dashboard_metrics(
    admin: User = Depends(require_admin)
):
    """
    Returns aggregated industrial metrics for the mission control dashboard.
    """
    return await IndustrialService.get_dashboard_metrics()

@router.get("/seller-churn")
async def get_seller_churn_risk(
    days_inactive: int = 30,
    admin: User = Depends(require_admin)
):
    """
    Identifies sellers at risk of churn (no orders in X days).
    """
    return await IndustrialService.get_seller_churn(days_inactive)

@router.get("/buyer-ltv")
async def get_buyer_ltv_report(
    admin: User = Depends(require_admin)
):
    """
    Calculates Lifetime Value (LTV) for top buyers.
    """
    return await IndustrialService.get_buyer_ltv()

@router.get("/top-sellers")
async def get_top_sellers_report(
    limit: int = 20,
    admin: User = Depends(require_admin)
):
    """
    Identifies highest-earning sellers with rating telemetry.
    """
    return await IndustrialService.get_top_sellers(limit)
