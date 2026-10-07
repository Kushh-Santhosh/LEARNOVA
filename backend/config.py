"""
LEARNOVA Configuration Module
Centralized, safe configuration management for backend services.
Adheres to security policies: never logs or leaks sensitive credentials.
"""

import os
from typing import Optional


class Settings:
    """Application settings with environment variable overrides."""

    def __init__(self):
        # Server
        self.PORT: int = int(os.getenv("PORT", "8000"))
        self.HOST: str = os.getenv("HOST", "0.0.0.0")

        # LLM Gateway
        self.OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "").strip()
        self.OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "").strip()
        self.GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()

        # Database / Persistence
        self.SUPABASE_URL: str = os.getenv("SUPABASE_URL", "").strip()
        self.SUPABASE_PUBLISHABLE_KEY: str = os.getenv("SUPABASE_PUBLISHABLE_KEY", "").strip()
        self.SUPABASE_SECRET_KEY: str = os.getenv("SUPABASE_SECRET_KEY", "").strip()

        # Real-time Voice
        self.LIVEKIT_URL: str = os.getenv("LIVEKIT_URL", "").strip()
        self.LIVEKIT_API_KEY: str = os.getenv("LIVEKIT_API_KEY", "").strip()
        self.LIVEKIT_API_SECRET: str = os.getenv("LIVEKIT_API_SECRET", "").strip()

        # Avatar
        self.HEYGEN_API_KEY: str = os.getenv("HEYGEN_API_KEY", "").strip()
        self.HEYGEN_AVATAR_ID: str = os.getenv("HEYGEN_AVATAR_ID", "default_professor_nova").strip()

        # Cost Targets (₹ INR)
        self.TARGET_COST_PER_MIN_INR: float = 10.0

    @property
    def has_openrouter(self) -> bool:
        return bool(self.OPENROUTER_API_KEY)

    @property
    def has_livekit(self) -> bool:
        return bool(self.LIVEKIT_URL and self.LIVEKIT_API_KEY and self.LIVEKIT_API_SECRET)

    @property
    def has_heygen(self) -> bool:
        return bool(self.HEYGEN_API_KEY)


settings = Settings()
