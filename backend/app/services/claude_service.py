import anthropic
import requests
from app.core.config import settings
from typing import List, Optional
import json

class ClaudeService:
    def __init__(self):
        self.anthropic_client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY) if settings.ANTHROPIC_API_KEY else None
        self.openrouter_key = settings.OPENROUTER_API_KEY
        self.model = settings.CLAUDE_MODEL

    async def _call_ai(self, prompt: str, max_tokens: int = 1000) -> str:
        """
        Universal caller that switches between Anthropic and OpenRouter.
        Priority: Primary (Claude Native), Backup (OpenRouter)
        """
        # 1. Try native Anthropic first (Primary)
        if self.anthropic_client:
            try:
                message = self.anthropic_client.messages.create(
                    model=self.model,
                    max_tokens=max_tokens,
                    messages=[{"role": "user", "content": prompt}]
                )
                if message.content:
                    return message.content[0].text
            except Exception as e:
                print(f"Primary (Anthropic) Error: {e}")

        # 2. Fallback to OpenRouter (Backup)
        if self.openrouter_key:
            try:
                # Map model name for OpenRouter if needed
                model = self.model
                if "claude" in model.lower() and "/" not in model:
                    model = f"anthropic/{model}"
                
                response = requests.post(
                    url="https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.openrouter_key}",
                        "Content-Type": "application/json",
                    },
                    data=json.dumps({
                        "model": model,
                        "messages": [{"role": "user", "content": prompt}],
                        "max_tokens": max_tokens
                    }),
                    timeout=30
                )
                res_json = response.json()
                if 'choices' not in res_json:
                    print(f"Backup (OpenRouter) Error Response: {res_json}")
                    return ""
                return res_json['choices'][0]['message']['content']
            except Exception as e:
                print(f"Backup (OpenRouter) Exception: {e}")
        
        return ""

    async def generate_smart_tags(self, title: str, description: str) -> List[str]:
        """
        Generates a list of relevant SEO tags for a listing based on its title and description.
        """

        prompt = f"""
        Analyze the following marketplace listing and suggest exactly 3-5 high-performing SEO tags/categories.
        Return ONLY a JSON list of strings.
        
        Title: {title}
        Description: {description}
        
        Example Output: ["SEO", "Backlinks", "Guest Post", "Digital Marketing"]
        """

        try:
            content_text = await self._call_ai(prompt)
            if not content_text:
                return ["Recommended"]
            
            tags = json.loads(content_text)
            return tags
        except Exception as e:
            print(f"Error parsing tags: {e}")
            return ["Recommended"]

    async def predict_search_intent(self, query: str) -> Optional[str]:
        """
        Mapped user searches to specific niches or categories.
        """
        prompt = f"Analyze the following search query and return the most likely marketplace niche as a single word: '{query}'"

        try:
            intent = await self._call_ai(prompt, max_tokens=100)
            return intent.strip() if intent else None
        except Exception:
            return None

    async def analyze_listing_risk(self, title: str, description: str, dr: int, traffic: str, price: float) -> dict:
        """
        Scans a gig for potential risks (PBNs, link farms, metric mismatches).
        Returns a dict: {"risk_score": float, "report": str}
        """

        prompt = f"""
        Act as an SEO Security Auditor for a backlink marketplace.
        Analyze this gig for potential risks (scams, PBNs, or metrics that don't match the price).
        Return YAML-formatted output with:
        risk_score: (0-100, where 100 is high risk)
        reason: (brief explanation)

        Gig Data:
        Title: {title}
        DR: {dr}
        Monthly Traffic: {traffic}
        Price: ${price}
        description: {description}
        """

        try:
            content = await self._call_ai(prompt, max_tokens=500)
            if not content:
                return {"risk_score": 5.0, "report": "AI did not respond."}
                
            # Simple heuristic parsing for this MVP
            score = 0.0
            if "risk_score:" in content:
                try: score = float(content.split("risk_score:")[1].split("\n")[0].strip())
                except: score = 10.0
            return {"risk_score": score, "report": content}
        except Exception as e:
            print(f"Error in risk scan: {e}")
            return {"risk_score": 5.0, "report": "Scan failed."}

    async def generate_market_insights(self, stats_summary: str) -> str:
        """
        Generates actionable revenue tips for publishers.
        """
        prompt = f"Analyze these marketplace stats and give 3 short, actionable tips to increase revenue: {stats_summary}"
        try:
            tips = await self._call_ai(prompt, max_tokens=600)
            return tips or "Focus on high DR placements to increase authority."
        except Exception:
            return "Keep your response speed high to stay competitive."

    async def verify_placement(self, proof_url: str, target_url: str) -> dict:
        """
        Verifies if a backlink exists on the provided proof page.
        """
        prompt = f"Check if a backlink pointing to '{target_url}' is likely present on the page '{proof_url}'. Return status (VERIFIED/REJECTED)."
        try:
            res = await self._call_ai(prompt, max_tokens=300)
            if not res:
                return {"status": "MANUAL_REVIEW", "report": "No AI response."}
                
            status = "VERIFIED" if "VERIFIED" in res.upper() else "REJECTED"
            return {"status": status, "report": res}
        except Exception:
            return {"status": "MANUAL_REVIEW", "report": "API Error."}

claude_service = ClaudeService()
