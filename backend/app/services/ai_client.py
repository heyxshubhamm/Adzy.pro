import os
import httpx
import json
from typing import Optional, List

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

async def get_embedding_with_failover(text: str) -> Optional[List[float]]:
    """
    Generate an embedding vector using a robust failover chain:
    Primary: OpenRouter
    Fallback: Native OpenAI
    """
    
    # Attempt 1: OpenRouter 
    if OPENROUTER_API_KEY:
        try:
            url = "https://openrouter.ai/api/v1/embeddings"
            headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
            data = {"model": "openai/text-embedding-3-small", "input": text}
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=data, timeout=10.0)
                if res.status_code == 200:
                    return res.json()["data"][0]["embedding"]
                else:
                    print(f"⚠️ OpenRouter Embedding Failed [{res.status_code}]: {res.text}")
        except Exception as e:
            print(f"⚠️ OpenRouter Embedding Connection Exception: {e}")

    # Attempt 2: Native OpenAI Fallback
    if OPENAI_API_KEY:
        try:
            url = "https://api.openai.com/v1/embeddings"
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
            data = {"model": "text-embedding-3-small", "input": text}
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=data, timeout=10.0)
                if res.status_code == 200:
                    return res.json()["data"][0]["embedding"]
                else:
                    print(f"⚠️ OpenAI Native Embedding Failed [{res.status_code}]: {res.text}")
        except Exception as e:
            print(f"⚠️ OpenAI Native Embedding Connection Exception: {e}")
            
    print("❌ FATAL: All AI Embedding providers failed or are entirely unconfigured in .env!")
    return None

async def get_llm_with_failover(system_prompt: str, user_content: str, max_tokens: int = 300) -> Optional[str]:
    """
    Execute an LLM prompt using a robust Failover chain:
    Primary: OpenRouter (Claude 3.5 Sonnet)
    Backup 1: Native Anthropic (Claude 3.5 Sonnet)
    Emergency 2: Native OpenAI (GPT-4o)
    """
    
    # Attempt 1: Primary (OpenRouter proxying Claude)
    if OPENROUTER_API_KEY:
        try:
            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
            data = {
                "model": "anthropic/claude-3.5-sonnet",
                "max_tokens": max_tokens,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ]
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=data, timeout=15.0)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"]
                else:
                    print(f"⚠️ OpenRouter LLM Failed [{res.status_code}]: {res.text}")
        except Exception as e:
            print(f"⚠️ OpenRouter LLM Connection Exception: {e}")

    # Attempt 2: Backup (Native Anthropic)
    if ANTHROPIC_API_KEY:
        try:
            url = "https://api.anthropic.com/v1/messages"
            headers = {
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json"
            }
            data = {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": max_tokens,
                "system": system_prompt,
                "messages": [{"role": "user", "content": user_content}]
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=data, timeout=15.0)
                if res.status_code == 200:
                    return res.json()["content"][0]["text"]
                else:
                    print(f"⚠️ Anthropic Native LLM Failed [{res.status_code}]: {res.text}")
        except Exception as e:
            print(f"⚠️ Anthropic Native LLM Connection Exception: {e}")

    # Attempt 3: Emergency Backup (Native OpenAI)
    if OPENAI_API_KEY:
        try:
            url = "https://api.openai.com/v1/chat/completions"
            headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type": "application/json"}
            data = {
                "model": "gpt-4o",
                "max_tokens": max_tokens,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ]
            }
            async with httpx.AsyncClient() as client:
                res = await client.post(url, headers=headers, json=data, timeout=15.0)
                if res.status_code == 200:
                    return res.json()["choices"][0]["message"]["content"]
                else:
                    print(f"⚠️ OpenAI Native LLM Failed [{res.status_code}]: {res.text}")
        except Exception as e:
            print(f"⚠️ OpenAI Native LLM Connection Exception: {e}")

    print("❌ FATAL: All AI LLM providers failed or are entirely unconfigured in .env!")
    return None
