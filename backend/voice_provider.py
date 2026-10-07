"""
LEARNOVA Voice Provider
Manages voice capabilities: browser-native (always) and LiveKit (when configured).
LiveKit credentials stay strictly server-side; clients receive only short-lived tokens.
"""

import os
from typing import Dict, Any, Optional


def _livekit_env() -> tuple[str, str, str]:
    """Returns (url, api_key, api_secret) from environment — never logs them."""
    return (
        os.getenv("LIVEKIT_URL", "").strip(),
        os.getenv("LIVEKIT_API_KEY", "").strip(),
        os.getenv("LIVEKIT_API_SECRET", "").strip(),
    )


def livekit_is_configured() -> bool:
    url, key, secret = _livekit_env()
    return bool(url and key and secret)


def generate_livekit_token(room: str, identity: str) -> Optional[str]:
    """
    Generates a short-lived LiveKit access token for a learner.
    api_secret NEVER leaves this function — only the signed JWT is returned.
    Returns None if LiveKit is not configured.
    """
    url, key, secret = _livekit_env()
    if not (url and key and secret):
        return None

    try:
        from livekit.api import AccessToken, VideoGrants
        token = (
            AccessToken(api_key=key, api_secret=secret)
            .with_identity(identity)
            .with_name(identity)
            .with_grants(
                VideoGrants(
                    room_join=True,
                    room=room,
                    can_publish=True,
                    can_subscribe=True,
                )
            )
            .to_jwt()
        )
        return token
    except Exception:
        return None


async def test_livekit_connection() -> Dict[str, Any]:
    """
    Performs a real authenticated LiveKit server-side connectivity test.
    Returns only metadata — no credentials, tokens, or secrets in the response.
    """
    url, key, secret = _livekit_env()
    if not (url and key and secret):
        return {"configured": False, "status": "NOT_CONFIGURED"}

    try:
        from livekit.api import LiveKitAPI
        from livekit.protocol import room as room_proto

        async with LiveKitAPI(url=url, api_key=key, api_secret=secret) as lk:
            resp = await lk.room.list_rooms(room_proto.ListRoomsRequest())
            return {
                "configured": True,
                "authenticated": True,
                "status": "CONNECTED",
                "active_rooms": len(resp.rooms),
                "url_host": url.split("//")[-1].split("/")[0],  # host only, not full URL with creds
            }
    except Exception as e:
        err_msg = str(e)
        safe_msg = err_msg if len(err_msg) < 120 else err_msg[:120]
        return {
            "configured": True,
            "authenticated": False,
            "status": "ERROR",
            "error": safe_msg,
        }



class VoiceService:
    def get_voice_capabilities(self) -> Dict[str, Any]:
        has_livekit = livekit_is_configured()
        return {
            "stt_active_provider": "livekit" if has_livekit else "browser_native",
            "tts_active_provider": "livekit" if has_livekit else "browser_native",
            "is_cloud_realtime": has_livekit,
            "livekit_configured": has_livekit,
            "supported_languages": [
                {"code": "en", "name": "English", "voice": "Professor Nova (EN)"},
                {"code": "kn", "name": "ಕನ್ನಡ (Kannada)", "voice": "Nova (Kannada)"},
                {"code": "hi", "name": "हिन्दी (Hindi)", "voice": "Nova (Hindi)"},
                {"code": "te", "name": "తెలుగు (Telugu)", "voice": "Nova (Telugu)"},
                {"code": "ta", "name": "தமிழ் (Tamil)", "voice": "Nova (Tamil)"},
            ],
            "supports_interruption": True,
        }


voice_service = VoiceService()
