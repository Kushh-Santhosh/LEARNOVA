"""
LEARNOVA Supabase / PostgreSQL Persistence Layer
Connects to Supabase REST API (PostgREST) when configured,
with in-memory persistence fallback.
"""

import os
import httpx
from typing import Dict, Any, List, Optional
from datetime import datetime

class SupabaseService:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY", "")
        self.service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    def is_configured(self) -> bool:
        return bool(self.supabase_url and (self.service_key or self.anon_key))

    def _headers(self) -> Dict[str, str]:
        key = self.service_key or self.anon_key
        return {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    async def test_connection(self) -> Dict[str, Any]:
        """Tests live connectivity to Supabase project."""
        if not self.is_configured():
            return {
                "configured": False,
                "status": "unconfigured",
                "message": "SUPABASE_URL or API key is not configured in .env."
            }
        
        try:
            async with httpx.AsyncClient(timeout=6.0) as client:
                res = await client.get(
                    f"{self.supabase_url}/rest/v1/",
                    headers=self._headers()
                )
                return {
                    "configured": True,
                    "status_code": res.status_code,
                    "connected": res.status_code in [200, 404], # 200 or root schema spec
                    "latency_ms": round(res.elapsed.total_seconds() * 1000, 2)
                }
        except Exception as e:
            return {
                "configured": True,
                "connected": False,
                "error": str(e)
            }

    async def save_learner_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Saves learner mastery/evidence record to remote table if configured."""
        if not self.is_configured():
            return {"saved": False, "mode": "in_memory_only"}

        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(
                    f"{self.supabase_url}/rest/v1/learner_evidence",
                    headers=self._headers(),
                    json=record
                )
                return {
                    "saved": res.status_code in [200, 201],
                    "status_code": res.status_code
                }
        except Exception as e:
            return {"saved": False, "error": str(e)}

supabase_service = SupabaseService()
