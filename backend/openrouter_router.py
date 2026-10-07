"""
LEARNOVA OpenRouter Free-Only Router & Gateway
Turn Information Into Understanding.

STRICT FREE-ONLY POLICY:
Enforces maximum model cost = $0.00 at code level before every API call.
Discovers free models dynamically from OpenRouter /api/v1/models endpoint,
filters by prompt_price == 0 and completion_price == 0,
and manages bounded fallback chains with zero possibility of billing.

Model health tracking with temporary cooldown prevents repeatedly hammering
a flaky model. Cooldown is in-memory only — resets on server restart.
"""

import os
import time
import httpx
from typing import Dict, Any, List, Optional

def _load_env_if_needed():
    if not os.getenv("OPENROUTER_API_KEY"):
        for path in [os.path.join(os.path.dirname(__file__), "..", ".env"), os.path.join(os.path.dirname(__file__), ".env")]:
            if os.path.exists(path):
                try:
                    with open(path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if line and not line.startswith("#") and "=" in line:
                                k, v = line.split("=", 1)
                                key = k.strip()
                                val = v.strip().strip("'\"")
                                if key and key not in os.environ:
                                    os.environ[key] = val
                except Exception:
                    pass

_load_env_if_needed()

# Verified baseline free models that maintain $0 pricing on OpenRouter
VERIFIED_FREE_MODELS = [
    {
        "id": "openrouter/free",
        "name": "OpenRouter Free Router",
        "prompt_price": 0.0,
        "completion_price": 0.0,
        "context_length": 200000,
    },
    {
        "id": "google/gemma-4-31b-it:free",
        "name": "Google Gemma 4 31B (Free)",
        "prompt_price": 0.0,
        "completion_price": 0.0,
        "context_length": 262144,
    },
    {
        "id": "qwen/qwen3.8-27b:free",
        "name": "Qwen 3.8 27B (Free)",
        "prompt_price": 0.0,
        "completion_price": 0.0,
        "context_length": 262144,
    },
    {
        "id": "nvidia/nemotron-3-super-120b-a12b:free",
        "name": "NVIDIA Nemotron 3 Super (Free)",
        "prompt_price": 0.0,
        "completion_price": 0.0,
        "context_length": 262144,
    },
    {
        "id": "liquid/lfm-2.5-2.6b:free",
        "name": "Liquid LFM 2.5 2.6B (Free)",
        "prompt_price": 0.0,
        "completion_price": 0.0,
        "context_length": 65536,
    },
]

# Model health tracking constants
_COOLDOWN_SEC = 120   # cool a model down for 2 min after consecutive failures
_FAIL_THRESHOLD = 3   # failures before cooldown
_MAX_ATTEMPTS = 5     # max models to try per request


class OpenRouterFreeRouter:
    """
    Central router for free-only OpenRouter model discovery, validation, and fallback.
    Includes per-model health tracking with automatic cooldown and recovery.
    """
    def __init__(self):
        self._cached_free_models: List[Dict[str, Any]] = []
        self._cache_timestamp: float = 0.0
        self._cache_ttl: float = 3600.0  # 1 hour

        # Runtime telemetry (never contains credentials)
        self.last_active_model: Optional[str] = None
        self.last_provider: str = "local"
        self.last_cost_tier: str = "FREE ($0.00)"
        self.fallback_status: str = "Local Engine Ready"
        self.last_latency_ms: float = 0.0
        self.last_attempt_count: int = 0
        self.last_fallback_used: bool = False

        # ponytail: simple dict-based health tracker — no DB, no extra deps
        # Structure: {model_id: {failures: int, cooldown_until: float, last_error: str}}
        self._model_health: Dict[str, Dict[str, Any]] = {}
        # Controlled test-mode simulation hook (never active unless set explicitly by test harness)
        self._simulated_failures: Dict[Any, Any] = {}

    def set_simulation(self, failures: Dict[Any, Any]) -> None:
        """Configures simulated model failures for controlled test passes."""
        self._simulated_failures = dict(failures)

    def clear_simulation(self) -> None:
        """Clears all test simulations."""
        self._simulated_failures = {}

    @property
    def api_key(self) -> str:
        return os.getenv("OPENROUTER_API_KEY", "").strip()

    @property
    def preferred_model(self) -> str:
        return os.getenv("OPENROUTER_MODEL", "").strip()

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _is_cooled_down(self, model_id: str) -> bool:
        """True if model is temporarily suppressed due to repeated failures."""
        health = self._model_health.get(model_id, {})
        cooldown_until = health.get("cooldown_until", 0.0)
        return time.time() < cooldown_until

    def _record_success(self, model_id: str) -> None:
        h = self._model_health.setdefault(model_id, {"failures": 0, "cooldown_until": 0.0})
        h["failures"] = 0
        h["cooldown_until"] = 0.0
        h["last_success"] = time.time()

    def _record_failure(self, model_id: str, reason: str) -> None:
        h = self._model_health.setdefault(model_id, {"failures": 0, "cooldown_until": 0.0})
        h["failures"] = h.get("failures", 0) + 1
        h["last_error"] = reason
        h["last_failure"] = time.time()
        if h["failures"] >= _FAIL_THRESHOLD:
            h["cooldown_until"] = time.time() + _COOLDOWN_SEC

    def get_model_health(self) -> Dict[str, Any]:
        """Safe-to-expose health metadata — no credentials."""
        now = time.time()
        return {
            mid: {
                "failures": h.get("failures", 0),
                "on_cooldown": now < h.get("cooldown_until", 0.0),
                "cooldown_remaining_sec": max(0, round(h.get("cooldown_until", 0.0) - now)),
                "last_error": h.get("last_error", ""),
            }
            for mid, h in self._model_health.items()
        }

    async def discover_free_models(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Queries OpenRouter models catalog and strictly filters to models with
        prompt price == 0 and completion price == 0.
        """
        now = time.time()
        if not force_refresh and self._cached_free_models and (now - self._cache_timestamp < self._cache_ttl):
            return self._cached_free_models

        discovered: List[Dict[str, Any]] = []
        try:
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get("https://openrouter.ai/api/v1/models")
                if res.status_code == 200:
                    raw_data = res.json().get("data", [])
                    for m in raw_data:
                        pricing = m.get("pricing", {})
                        try:
                            prompt_price = float(pricing.get("prompt", 1.0))
                            completion_price = float(pricing.get("completion", 1.0))
                            request_price = float(pricing.get("request", 0.0))
                            image_price = float(pricing.get("image", 0.0))
                        except (ValueError, TypeError):
                            continue

                        # STRICT FREE-ONLY GUARD: All prices must be exactly zero
                        if prompt_price != 0.0 or completion_price != 0.0 or request_price != 0.0 or image_price != 0.0:
                            continue

                        # Ensure text generation architecture
                        arch = m.get("architecture", {})
                        modality = arch.get("modality", "")
                        if "->text" not in modality and modality != "":
                            continue

                        input_modalities = arch.get("input_modalities", [])
                        is_vision = ("image" in modality) or ("image" in input_modalities) or any(k in m.get("id", "").lower() for k in ["vision", "-vl"])

                        discovered.append({
                            "id": m.get("id"),
                            "name": m.get("name", m.get("id")),
                            "prompt_price": 0.0,
                            "completion_price": 0.0,
                            "context_length": m.get("context_length", 32768),
                            "is_vision": is_vision
                        })
        except Exception:
            # Endpoint temporarily unreachable; fallback safely
            pass

        if not discovered:
            discovered = list(VERIFIED_FREE_MODELS)

        self._cached_free_models = discovered
        self._cache_timestamp = now
        return discovered

    def _build_candidate_chain(self, free_models: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Builds the failover chain, skipping models currently on cooldown.
        Prioritizes: user preference → openrouter/free → verified models → others.
        """
        candidates: List[Dict[str, Any]] = []
        free_by_id = {m["id"]: m for m in free_models}

        def _add(mid: str) -> None:
            if mid in free_by_id and not self._is_cooled_down(mid):
                m = free_by_id[mid]
                if m not in candidates:
                    candidates.append(m)

        # 1. User-configured preference (only if strictly free)
        if self.preferred_model:
            _add(self.preferred_model)

        # 2. openrouter/free dynamic router
        _add("openrouter/free")

        # 3. Verified seed models
        for vm in VERIFIED_FREE_MODELS:
            _add(vm["id"])

        # 4. Remaining discovered free models up to cap
        for m in free_models:
            if not self._is_cooled_down(m["id"]) and m not in candidates:
                candidates.append(m)
            if len(candidates) >= _MAX_ATTEMPTS:
                break

        return candidates[:_MAX_ATTEMPTS]

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: str = "",
        max_tokens: int = 800,
        temperature: float = 0.3
    ) -> Optional[Dict[str, Any]]:
        """
        Attempts generation using strict free-only failover chain with health tracking.
        Returns None on any failure, signalling fallback to local deterministic teacher.
        Never touches Gemini or any paid model.
        """
        if not self.is_configured():
            self.last_provider = "local"
            self.last_active_model = "Deterministic Teacher Brain"
            self.fallback_status = "Local Fallback Active (OPENROUTER_API_KEY not configured)"
            return None

        free_models = await self.discover_free_models()
        candidates = self._build_candidate_chain(free_models)

        if not candidates:
            self.fallback_status = "Local Fallback Active (Zero free models available or all on cooldown)"
            return None

        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://learnova.ai",
            "X-Title": "LEARNOVA Adaptive AI Classroom",
            "Content-Type": "application/json"
        }

        attempt = 0
        for candidate in candidates:
            model_id = candidate["id"]
            attempt += 1

            # HARD BILLING SAFETY ASSERTION AT EXECUTION TIME
            if candidate["prompt_price"] != 0.0 or candidate["completion_price"] != 0.0:
                self._record_failure(model_id, "billing_guard_blocked")
                continue

            # Controlled test simulation check (safe test harness without credentials breakage)
            sim_failure = self._simulated_failures.get(model_id) or self._simulated_failures.get(attempt)
            if sim_failure:
                if sim_failure == "timeout":
                    self._record_failure(model_id, "timeout")
                    continue
                elif sim_failure == 429:
                    continue
                elif isinstance(sim_failure, int) and sim_failure in [500, 502, 503, 504]:
                    self._record_failure(model_id, f"http_{sim_failure}_server_error")
                    continue
                elif sim_failure == "all_fail":
                    self._record_failure(model_id, "simulated_fail")
                    continue

            payload = {
                "model": model_id,
                "messages": messages,
                "max_tokens": max_tokens,
                "temperature": temperature
            }

            start_t = time.time()
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json=payload
                    )
                    elapsed_ms = round((time.time() - start_t) * 1000, 2)

                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            msg = choices[0].get("message", {})
                            raw_content = msg.get("content") or msg.get("reasoning") or ""
                            text = str(raw_content).strip()
                            if text:
                                self._record_success(model_id)
                                self.last_active_model = model_id
                                self.last_provider = "OpenRouter"
                                self.last_cost_tier = "FREE ($0.00)"
                                self.fallback_status = "Available / Active"
                                self.last_latency_ms = elapsed_ms
                                self.last_attempt_count = attempt
                                self.last_fallback_used = (attempt > 1)
                                return {
                                    "provider": "openrouter",
                                    "model": model_id,
                                    "text": text,
                                    "cost_tier": "FREE",
                                    "latency_ms": elapsed_ms,
                                    "attempt": attempt,
                                    "fallback_used": attempt > 1,
                                }
                        self._record_failure(model_id, "empty_response")

                    elif resp.status_code == 429:
                        # Rate limited — don't penalize model health for quota exhaustion
                        # but do skip it for this request
                        continue
                    elif resp.status_code in [404, 400]:
                        self._record_failure(model_id, f"http_{resp.status_code}_invalid_model")
                        continue
                    elif resp.status_code in [500, 502, 503, 504]:
                        self._record_failure(model_id, f"http_{resp.status_code}_server_error")
                        continue
                    else:
                        self._record_failure(model_id, f"http_{resp.status_code}_unexpected")
                        continue

            except httpx.TimeoutException:
                self._record_failure(model_id, "timeout")
                continue
            except httpx.RequestError as e:
                self._record_failure(model_id, f"network_error:{type(e).__name__}")
                continue

        # All free models exhausted or failed
        self.fallback_status = "Local Fallback Active (Free OpenRouter chain exhausted or rate-limited)"
        self.last_active_model = "Local Teacher Fallback"
        self.last_provider = "local"
        self.last_attempt_count = attempt
        self.last_fallback_used = True
        return None

    def get_status(self) -> Dict[str, Any]:
        """Returns health diagnostics for developer panel without leaking credentials."""
        configured = self.is_configured()
        return {
            "provider": "OpenRouter",
            "is_configured": configured,
            "status": "AVAILABLE" if configured else "NOT_CONFIGURED",
            "active_model": self.last_active_model or ("OpenRouter Free Fallback" if configured else "Local Teacher"),
            "cost_tier": "FREE ($0.00)",
            "hard_cost_guard": "STRICT_ZERO_DOLLAR_ENFORCED",
            "fallback_status": self.fallback_status,
            "cached_free_models_count": len(self._cached_free_models),
            "last_latency_ms": self.last_latency_ms,
            "last_attempt_count": self.last_attempt_count,
            "last_fallback_used": self.last_fallback_used,
            "model_health": self.get_model_health(),
        }


openrouter_router = OpenRouterFreeRouter()
