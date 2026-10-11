"""
LEARNOVA Unified LLM Provider Gateway & Router
Supports Gemini, OpenRouter (strict free-tier $0.00), and OpenAI.
Provides bounded failover, streaming tokens, model health tracking,
and safe diagnostic telemetry without exposing secrets.
"""

import os
import time
import json
import asyncio
from typing import Dict, Any, List, Optional, AsyncGenerator
import httpx

from config import settings
from openrouter_router import openrouter_router


class GeminiProvider:
    """Direct Google Gemini REST API client with streaming and health tracking."""

    def __init__(self):
        self.last_latency_ms: float = 0.0
        self.consecutive_failures: int = 0
        self.last_error: str = ""

    def is_configured(self) -> bool:
        return bool(settings.GEMINI_API_KEY)

    def is_healthy(self) -> bool:
        return self.is_configured() and self.consecutive_failures < 3

    def _get_model_name(self) -> str:
        model = settings.GEMINI_MODEL or "models/gemini-flash-latest"
        if not model.startswith("models/"):
            model = f"models/{model}"
        return model

    async def generate(self, prompt: str, system_prompt: str = "", timeout_sec: float = 12.0) -> Optional[Dict[str, Any]]:
        if not self.is_configured():
            return None

        model = self._get_model_name()
        url = f"https://generativelanguage.googleapis.com/v1beta/{model}:generateContent?key={settings.GEMINI_API_KEY}"
        
        contents = []
        if system_prompt:
            contents.append({
                "role": "user",
                "parts": [{"text": f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nPlease follow these instructions strictly."}]
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Understood. I will follow your instructions as Professor Nova."}]
            })
        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 2048,
            }
        }

        start_t = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                res = await client.post(url, json=payload)
                self.last_latency_ms = round((time.perf_counter() - start_t) * 1000, 2)

                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        text = "".join([p.get("text", "") for p in parts]).strip()
                        self.consecutive_failures = 0
                        self.last_error = ""
                        return {
                            "provider": "gemini",
                            "model": model,
                            "text": text,
                            "cost_tier": "GEMINI_NATIVE",
                            "latency_ms": self.last_latency_ms,
                            "fallback_used": False
                        }
                    else:
                        self.consecutive_failures += 1
                        self.last_error = "No content parts returned"
                        return None
                else:
                    self.consecutive_failures += 1
                    self.last_error = f"HTTP {res.status_code}"
                    return None
        except Exception as e:
            self.last_latency_ms = round((time.perf_counter() - start_t) * 1000, 2)
            self.consecutive_failures += 1
            self.last_error = str(e)[:100]
            return None

    async def stream_generate(self, prompt: str, system_prompt: str = "", timeout_sec: float = 20.0) -> AsyncGenerator[str, None]:
        """Streams response tokens via Gemini Server-Sent Events."""
        if not self.is_configured():
            return

        model = self._get_model_name()
        url = f"https://generativelanguage.googleapis.com/v1beta/{model}:streamGenerateContent?alt=sse&key={settings.GEMINI_API_KEY}"

        contents = []
        if system_prompt:
            contents.append({
                "role": "user",
                "parts": [{"text": f"SYSTEM INSTRUCTIONS:\n{system_prompt}\n\nPlease follow these instructions strictly."}]
            })
            contents.append({
                "role": "model",
                "parts": [{"text": "Understood. I will follow your instructions as Professor Nova."}]
            })
        contents.append({
            "role": "user",
            "parts": [{"text": prompt}]
        })

        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": 0.4,
                "maxOutputTokens": 2048,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                async with client.stream("POST", url, json=payload) as resp:
                    if resp.status_code != 200:
                        return
                    async for line in resp.aiter_lines():
                        if line.startswith("data: "):
                            raw_data = line[6:].strip()
                            if not raw_data:
                                continue
                            try:
                                chunk_json = json.loads(raw_data)
                                candidates = chunk_json.get("candidates", [])
                                if candidates and "content" in candidates[0]:
                                    parts = candidates[0]["content"].get("parts", [])
                                    for p in parts:
                                        t = p.get("text", "")
                                        if t:
                                            yield t
                            except Exception:
                                continue
        except Exception:
            return


class OpenAIProvider:
    """Direct OpenAI API client with streaming and health tracking."""

    def __init__(self):
        self.last_latency_ms: float = 0.0
        self.consecutive_failures: int = 0
        self.last_error: str = ""

    def is_configured(self) -> bool:
        return bool(settings.OPENAI_API_KEY)

    def is_healthy(self) -> bool:
        return self.is_configured() and self.consecutive_failures < 3

    async def generate(self, prompt: str, system_prompt: str = "", timeout_sec: float = 12.0) -> Optional[Dict[str, Any]]:
        if not self.is_configured():
            return None

        model = settings.OPENAI_MODEL or "gpt-4o-mini"
        url = "https://api.openai.com/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json"
        }
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        payload = {
            "model": model,
            "messages": messages,
            "temperature": 0.4,
            "max_tokens": 2048,
        }

        start_t = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=timeout_sec) as client:
                res = await client.post(url, json=payload, headers=headers)
                self.last_latency_ms = round((time.perf_counter() - start_t) * 1000, 2)
                if res.status_code == 200:
                    data = res.json()
                    choices = data.get("choices", [])
                    if choices:
                        text = choices[0].get("message", {}).get("content", "").strip()
                        self.consecutive_failures = 0
                        self.last_error = ""
                        return {
                            "provider": "openai",
                            "model": model,
                            "text": text,
                            "cost_tier": "OPENAI_NATIVE",
                            "latency_ms": self.last_latency_ms,
                            "fallback_used": False
                        }
                self.consecutive_failures += 1
                self.last_error = f"HTTP {res.status_code}"
                return None
        except Exception as e:
            self.last_latency_ms = round((time.perf_counter() - start_t) * 1000, 2)
            self.consecutive_failures += 1
            self.last_error = str(e)[:100]
            return None


class CentralLLMRouter:
    """
    Unified multi-provider router.
    Selection policy:
      1. Primary: Gemini (if configured, high performance)
      2. Secondary: OpenAI (if configured)
      3. Tertiary / Zero-cost: OpenRouter (strictly free $0.00 models)
      4. Bounded failover with zero infinite loops.
    """

    def __init__(self):
        self.gemini = GeminiProvider()
        self.openai = OpenAIProvider()
        self.openrouter = openrouter_router
        self.last_active_provider: str = "none"

    def get_status(self) -> Dict[str, Any]:
        """Safe diagnostics without revealing secrets."""
        providers_info = []
        
        # Gemini
        providers_info.append({
            "name": "gemini",
            "configured": self.gemini.is_configured(),
            "healthy": self.gemini.is_healthy(),
            "model": self.gemini._get_model_name() if self.gemini.is_configured() else None,
            "last_latency_ms": self.gemini.last_latency_ms,
            "status": "AVAILABLE" if self.gemini.is_healthy() else ("ERROR" if self.gemini.is_configured() else "NOT_CONFIGURED")
        })

        # OpenAI
        providers_info.append({
            "name": "openai",
            "configured": self.openai.is_configured(),
            "healthy": self.openai.is_healthy(),
            "model": settings.OPENAI_MODEL if self.openai.is_configured() else None,
            "last_latency_ms": self.openai.last_latency_ms,
            "status": "AVAILABLE" if self.openai.is_healthy() else ("ERROR" if self.openai.is_configured() else "NOT_CONFIGURED")
        })

        # OpenRouter
        or_status = self.openrouter.get_status()
        providers_info.append({
            "name": "openrouter",
            "configured": self.openrouter.is_configured(),
            "healthy": or_status.get("status") == "AVAILABLE",
            "model": or_status.get("active_model"),
            "cost_tier": "FREE ($0.00)",
            "last_latency_ms": self.openrouter.last_latency_ms,
            "status": or_status.get("status", "NOT_CONFIGURED")
        })

        # Determine current primary active provider
        primary = "local"
        if self.gemini.is_healthy():
            primary = "gemini"
        elif self.openai.is_healthy():
            primary = "openai"
        elif self.openrouter.is_configured():
            primary = "openrouter"

        return {
            "primary_provider": primary,
            "last_active_provider": self.last_active_provider,
            "providers": providers_info,
            "zero_dollar_guard": "ENFORCED"
        }

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: str = "",
        preferred_provider: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Executes bounded, prioritized provider completion with safe fallback.
        """
        # If preferred provider requested and configured, try it first
        if preferred_provider == "openai" and self.openai.is_configured():
            res = await self.openai.generate(prompt, system_prompt)
            if res:
                self.last_active_provider = "openai"
                return res

        # 1. Try Gemini
        if self.gemini.is_configured():
            res = await self.gemini.generate(prompt, system_prompt)
            if res:
                self.last_active_provider = "gemini"
                return res

        # 2. Try OpenAI if configured
        if self.openai.is_configured():
            res = await self.openai.generate(prompt, system_prompt)
            if res:
                self.last_active_provider = "openai"
                return res

        # 3. Try OpenRouter (guaranteed free $0.00)
        if self.openrouter.is_configured():
            res = await self.openrouter.generate_completion(prompt, system_prompt)
            if res:
                self.last_active_provider = "openrouter"
                res["fallback_used"] = (self.gemini.is_configured() or self.openai.is_configured())
                return res

        self.last_active_provider = "local"
        return None

    async def stream_completion(
        self,
        prompt: str,
        system_prompt: str = ""
    ) -> AsyncGenerator[str, None]:
        """Streams completion tokens using the fastest available streaming provider."""
        if self.gemini.is_configured():
            async for chunk in self.gemini.stream_generate(prompt, system_prompt):
                yield chunk
            return

        # Fallback to non-streaming chunked emit if streaming provider is unavailable
        full_res = await self.generate_completion(prompt, system_prompt)
        if full_res and full_res.get("text"):
            words = full_res["text"].split(" ")
            for i in range(0, len(words), 3):
                chunk = " ".join(words[i:i+3]) + (" " if i + 3 < len(words) else "")
                yield chunk
                await asyncio.sleep(0.02)


# Central singleton instance
llm_router = CentralLLMRouter()
