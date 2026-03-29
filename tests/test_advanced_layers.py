import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.claude_service import claude_service
from app.core.config import settings

async def test_advanced_intelligence():
    print("--- ADZY INTELLIGENCE LAYER TESTING ---")
    
    # 1. Test Risk Scan
    print("\n[Layer: Trust & Risk] Scanning mock listing for risks...")
    risk_data = await claude_service.analyze_listing_risk(
        "Cheap Guest Post on Link Farm",
        "I will provide 1000 backlinks for $5 on any site.",
        10, "1k", 5.0
    )
    print(f"Risk Score: {risk_data.get('risk_score')}")
    print(f"Risk Report Snippet: {risk_data.get('report')[:100]}...")

    # 2. Test Market Insights
    print("\n[Layer: Economic Intelligence] Generating publisher tips...")
    stats_summary = "Gig: Tech Guest Post, DR: 40, Views: 500, Orders: 2, CR: 0.004"
    tips = await claude_service.generate_market_insights(stats_summary)
    print(f"AI Recommendations: {tips}")

    # 3. Test Verification
    print("\n[Layer: Proof Verification] Mocking backlink check...")
    proof_url = "https://example-blog.com/post-1/"
    target_url = "https://buyer-site.com"
    verification = await claude_service.verify_placement(proof_url, target_url)
    print(f"Verification Status: {verification.get('status')}")
    print(f"AI Verification Report: {verification.get('report')}")

if __name__ == "__main__":
    asyncio.run(test_advanced_intelligence())
