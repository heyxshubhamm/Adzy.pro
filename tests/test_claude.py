import asyncio
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.services.claude_service import claude_service
from app.core.config import settings

async def test_claude_tagging():
    print(f"Testing Claude with model: {settings.CLAUDE_MODEL}")
    
    if not settings.ANTHROPIC_API_KEY:
        print("WARNING: ANTHROPIC_API_KEY is not set in .env. Test will run in fallback mode.")
    
    title = "High DR SEO Guest Post on Tech Blog"
    description = "I will provide a high-quality guest post on a high Domain Rating (DR 70+) technology blog. Includes 2 do-follow backlinks and permanent placement."
    
    print("\nGenerating tags...")
    tags = await claude_service.generate_smart_tags(title, description)
    print(f"Generated Tags: {tags}")
    
    intent_query = "buy backlinks for shopify store"
    print(f"\nPredicting intent for: '{intent_query}'")
    intent = await claude_service.predict_search_intent(intent_query)
    print(f"Predicted Intent: {intent}")

if __name__ == "__main__":
    asyncio.run(test_claude_tagging())
