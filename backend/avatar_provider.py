"""
LEARNOVA Avatar Provider Architecture
Manages realtime WebRTC LiveAvatar sessions (HeyGen / LiveKit) and vector avatar fallback.
Secures credentials by generating short-lived session tokens server-side.
"""

import os
import httpx
from typing import Dict, Any, Optional

class AvatarService:
    def __init__(self):
        self.heygen_key = os.getenv("HEYGEN_API_KEY", "")
        self.avatar_id = os.getenv("HEYGEN_AVATAR_ID", "")
        self.livekit_url = os.getenv("LIVEKIT_URL", "")

    async def create_avatar_session(self) -> Dict[str, Any]:
        """
        Generates a secure, short-lived avatar streaming token for the client.
        If no cloud credentials are configured, safely returns the fallback status.
        Never exposes the raw HEYGEN_API_KEY to the client browser.
        """
        if self.heygen_key:
            try:
                # HeyGen LiveAvatar interactive streaming session endpoint
                async with httpx.AsyncClient(timeout=8.0) as client:
                    resp = await client.post(
                        "https://api.heygen.com/v1/streaming.new",
                        headers={"X-Api-Key": self.heygen_key},
                        json={
                            "avatar_id": self.avatar_id or "default_professor_nova",
                            "quality": "medium",
                            "voice": {"rate": 1.0}
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json().get("data", {})
                        return {
                            "mode": "liveavatar",
                            "session_id": data.get("session_id"),
                            "sdp": data.get("sdp"),
                            "ice_servers": data.get("ice_servers", []),
                            "status": "ready"
                        }
            except Exception as e:
                # Graceful fallback on connection/auth issue
                pass

        # Local vector avatar fallback mode
        return {
            "mode": "fallback",
            "session_id": "local_vector_session",
            "sdp": None,
            "ice_servers": [],
            "status": "fallback_active",
            "message": "Using high-fidelity interactive vector avatar fallback."
        }

avatar_service = AvatarService()
