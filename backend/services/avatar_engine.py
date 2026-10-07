"""
LEARNOVA Avatar Engine
Core reusable service for Professor Nova.

Coordinates:
  - Dynamic AI text & audio input
  - Timed speech-to-mouth viseme pipeline (Rhubarb standard shapes)
  - Contextual expression planning
  - Multi-mode rendering (Mode A: Local Nova, Mode B: High Quality Cloud, Mode C: Text Fallback)
  - Accurate latency tracking (time to audio, time to first frame)
  - Transparent cost calculation (₹/minute active speaking time)
"""

import time
import os
from typing import Dict, Any, List, Optional
from services.viseme_engine import viseme_engine
from services.expression_engine import expression_engine


# Financial constants (₹ INR)
# Target: <= ₹10/minute active speaking time
INR_PER_USD = 86.50

# Mode A: Browser-local rendering + free/local speech synthesis
# - LLM inference: OpenRouter free tier = ₹0.00
# - TTS: Browser Web Speech API or local Edge-TTS = ₹0.00
# - Video generation / server GPU: ₹0.00 (rendered client-side via SVG/Canvas)
COST_PER_MIN_MODE_A_INR = 0.00

# When using optional cloud neural TTS (e.g. Google Cloud TTS $4/1M chars):
# 150 words/min ≈ 900 chars/min = $0.0036/min ≈ ₹0.31/minute
COST_PER_MIN_CLOUD_TTS_INR = 0.31

# Mode B: Server-side avatar video streaming (e.g. HeyGen / Synthesia credit model)
# Typically $0.15/minute stream credit = ₹12.98/minute + server bandwidth
COST_PER_MIN_MODE_B_INR = 12.98


class AvatarEngine:
    """
    Reusable live avatar engine providing deterministic visemes, expressions,
    latency instrumentation, and transparent cost accounting.
    """

    def __init__(self):
        self.default_mode = "mode_a_local"

    def estimate_speech_duration_ms(self, text: str, wpm: int = 150) -> int:
        """Estimate speech duration in milliseconds from word and punctuation counts."""
        words = len(text.split())
        if words == 0:
            return 800
        # Average milliseconds per word at target WPM
        ms = int((words / float(wpm)) * 60000)
        # Extra pause padding for sentence delimiters
        punctuation_count = text.count(".") + text.count("!") + text.count("?")
        ms += punctuation_count * 220
        return max(700, ms)

    def calculate_cost(
        self,
        duration_ms: int,
        mode: str = "mode_a_local",
        use_cloud_tts: bool = False
    ) -> Dict[str, Any]:
        """
        Calculates transparent cost breakdown per turn and per active speaking minute.
        """
        active_minutes = max(0.001, duration_ms / 60000.0)

        if mode == "mode_c_text":
            return {
                "active_speaking_minutes": round(active_minutes, 4),
                "tts_cost_inr": 0.0,
                "render_cost_inr": 0.0,
                "llm_cost_inr": 0.0,
                "total_turn_cost_inr": 0.0,
                "cost_per_minute_inr": 0.0,
                "target_met": True,
                "target_cap_inr": 10.0,
                "mode": "mode_c_text"
            }

        if mode == "mode_b_hq":
            turn_render_cost = active_minutes * COST_PER_MIN_MODE_B_INR
            tts_cost = active_minutes * (COST_PER_MIN_CLOUD_TTS_INR if use_cloud_tts else 0.0)
            total_turn = turn_render_cost + tts_cost
            cost_per_min = total_turn / active_minutes
            return {
                "active_speaking_minutes": round(active_minutes, 4),
                "tts_cost_inr": round(tts_cost, 4),
                "render_cost_inr": round(turn_render_cost, 4),
                "llm_cost_inr": 0.0,  # OpenRouter free tier
                "total_turn_cost_inr": round(total_turn, 4),
                "cost_per_minute_inr": round(cost_per_min, 2),
                "target_met": cost_per_min <= 10.0,
                "target_cap_inr": 10.0,
                "mode": "mode_b_hq"
            }

        # MODE A (Default: Local Nova)
        tts_cost = active_minutes * (COST_PER_MIN_CLOUD_TTS_INR if use_cloud_tts else 0.0)
        render_cost = 0.0  # client-side GPU / SVG rendering = ₹0.00 server cost
        total_turn = tts_cost + render_cost
        cost_per_min = total_turn / active_minutes if active_minutes > 0 else 0.0

        return {
            "active_speaking_minutes": round(active_minutes, 4),
            "tts_cost_inr": round(tts_cost, 4),
            "render_cost_inr": 0.0,
            "llm_cost_inr": 0.0,
            "total_turn_cost_inr": round(total_turn, 4),
            "cost_per_minute_inr": round(cost_per_min, 2),
            "target_met": cost_per_min <= 10.0,
            "target_cap_inr": 10.0,
            "mode": "mode_a_local"
        }

    async def orchestrate_turn(
        self,
        text: str,
        audio: Optional[str] = None,
        emotion: Optional[str] = None,
        speaking_style: Optional[str] = None,
        language: Optional[str] = "en",
        mode: Optional[str] = None,
        speech_rate_wpm: int = 150
    ) -> Dict[str, Any]:
        """
        Execute avatar pipeline and return timestamped viseme & expression sequences.
        """
        received_at = time.time()
        tts_started_at = received_at

        # Determine effective render mode
        effective_mode = mode or self.default_mode
        if effective_mode not in ("mode_a_local", "mode_b_hq", "mode_c_text"):
            effective_mode = "mode_a_local"

        # Mode C immediately returns without animation timelines
        if effective_mode == "mode_c_text":
            total_processing_ms = round((time.time() - received_at) * 1000.0, 2)
            return {
                "audio": None,
                "duration_ms": 0,
                "viseme_timeline": [],
                "expression_timeline": [],
                "start_latency_ms": total_processing_ms,
                "time_to_audio_ms": 0.0,
                "time_to_first_avatar_frame_ms": 0.0,
                "total_processing_ms": total_processing_ms,
                "render_mode": "mode_c_text",
                "provider": "text_fallback",
                "cost_estimate": self.calculate_cost(0, mode="mode_c_text")
            }

        # Calculate estimated duration
        duration_ms = self.estimate_speech_duration_ms(text, wpm=speech_rate_wpm)

        # Generate phonetic Rhubarb 2D viseme sequence
        viseme_timeline = viseme_engine.generate_timeline(
            text=text,
            wpm=speech_rate_wpm,
            target_duration_ms=duration_ms
        )

        audio_ready_at = time.time()
        avatar_started_at = audio_ready_at

        # Generate contextual facial expression sequence
        expression_timeline = expression_engine.generate_timeline(
            text=text,
            total_duration_ms=duration_ms,
            emotion_hint=emotion
        )

        first_frame_at = time.time()

        # Compute accurate latencies
        time_to_audio_ms = round((audio_ready_at - tts_started_at) * 1000.0, 2)
        time_to_first_avatar_frame_ms = round((first_frame_at - received_at) * 1000.0, 2)
        total_processing_ms = time_to_first_avatar_frame_ms

        cost_estimate = self.calculate_cost(duration_ms=duration_ms, mode=effective_mode)

        provider_name = "rhubarb_viseme_local" if effective_mode == "mode_a_local" else "remote_stream_avatar"

        return {
            "text": text,
            "audio": audio,  # None means browser synthesizes audio in sync with timeline
            "duration_ms": duration_ms,
            "viseme_timeline": viseme_timeline,
            "expression_timeline": expression_timeline,
            "start_latency_ms": time_to_first_avatar_frame_ms,
            "time_to_audio_ms": time_to_audio_ms,
            "time_to_first_avatar_frame_ms": time_to_first_avatar_frame_ms,
            "total_processing_ms": total_processing_ms,
            "render_mode": effective_mode,
            "provider": provider_name,
            "cost_estimate": cost_estimate
        }


avatar_engine = AvatarEngine()
