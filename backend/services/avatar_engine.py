"""
LEARNOVA Avatar Engine
Core reusable service for Professor Nova.

Coordinates:
  - Speech timing via SpeechTimingProvider (separates estimated vs actual audio timing)
  - Timed speech-to-mouth viseme pipeline (Rhubarb-compatible 2D shapes A-H, X)
  - Contextual expression planning
  - Multi-mode rendering (Mode A: Local Nova, Mode B: Provider Abstraction, Mode C: Text Fallback)
  - Accurate latency tracking (backend_avatar_plan_latency_ms vs browser telemetry)
  - Granular cost accounting (avatar rendering, TTS, LLM, bandwidth)
  - Real failover tracking
"""

import time
import os
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from services.viseme_engine import viseme_engine
from services.expression_engine import expression_engine


# Financial constants (₹ INR)
# Competition Target: <= ₹10/minute active speaking time
INR_PER_USD = 86.50

# Mode A: Browser-local rendering
# Server GPU rendering cost: ₹0.00 (rendered client-side via SVG)
COST_PER_MIN_SERVER_RENDER_MODE_A_INR = 0.00

# Mode B: Illustrative cloud video avatar streaming baseline (e.g. HeyGen $0.15/min stream credit)
# Stored as an illustrative baseline comparison; not an internal LEARNOVA charge.
ILLUSTRATIVE_CLOUD_STREAMING_COST_PER_MIN_INR = 12.98

# TTS Costs
COST_PER_MIN_BROWSER_TTS_INR = 0.00  # Browser Web Speech API: ₹0.00 direct server API fee
COST_PER_MIN_CLOUD_NEURAL_TTS_INR = 0.31  # Optional cloud neural TTS ($4/1M chars, ~900 chars/min)

# LLM Costs
COST_PER_MIN_OPENROUTER_FREE_INR = 0.00

# Network Bandwidth Cost (JSON event payloads < 2KB per turn)
COST_PER_MIN_BANDWIDTH_INR = 0.001


class SpeechTimingProvider(ABC):
    """Abstract provider for audio duration and timing."""
    @abstractmethod
    def get_duration_ms(self, text: str, actual_audio_duration_ms: Optional[int] = None) -> Dict[str, Any]:
        pass


class BrowserSpeechTimingProvider(SpeechTimingProvider):
    """
    Browser-native speech timing provider.
    Notes that browser Web Speech API synthesizes speech client-side without
    exposing server-side phoneme timestamps ahead of time.
    """
    def __init__(self, default_wpm: int = 150):
        self.default_wpm = default_wpm

    def estimate_duration_ms(self, text: str, wpm: Optional[int] = None) -> int:
        rate = wpm or self.default_wpm
        words = len(text.split())
        if words == 0:
            return 600
        ms = int((words / float(rate)) * 60000)
        punctuation_count = text.count(".") + text.count("!") + text.count("?") + text.count(",")
        ms += punctuation_count * 180
        return max(700, ms)

    def get_duration_ms(self, text: str, actual_audio_duration_ms: Optional[int] = None) -> Dict[str, Any]:
        est = self.estimate_duration_ms(text)
        return {
            "timing_source": "browser_web_speech",
            "estimated_duration_ms": est,
            "actual_audio_duration_ms": actual_audio_duration_ms,
            "phoneme_timestamps_source": "estimated_heuristic (browser Web Speech does not expose server phoneme timings)",
            "effective_duration_ms": actual_audio_duration_ms if actual_audio_duration_ms else est
        }


class OptionalCloudTTSProvider(SpeechTimingProvider):
    """Optional Cloud Neural TTS timing provider."""
    def get_duration_ms(self, text: str, actual_audio_duration_ms: Optional[int] = None) -> Dict[str, Any]:
        return {
            "timing_source": "cloud_neural_tts",
            "estimated_duration_ms": int(len(text.split()) * 380),
            "actual_audio_duration_ms": actual_audio_duration_ms,
            "phoneme_timestamps_source": "cloud_provider_audio_metadata" if actual_audio_duration_ms else "estimated",
            "effective_duration_ms": actual_audio_duration_ms or int(len(text.split()) * 380)
        }


class AvatarEngine:
    """
    Reusable live avatar engine providing deterministic visemes, expressions,
    accurate latency categorization, granular cost accounting, and real failover.
    """

    def __init__(self):
        self.default_mode = "mode_a_local"
        self.timing_provider = BrowserSpeechTimingProvider()

    def calculate_cost(
        self,
        duration_ms: int,
        mode: str = "mode_a_local",
        use_cloud_tts: bool = False
    ) -> Dict[str, Any]:
        """
        Calculates granular, transparent cost breakdown separating
        Avatar Rendering, TTS, LLM, and Bandwidth.
        """
        active_minutes = max(0.001, duration_ms / 60000.0)

        if mode == "mode_c_text":
            return {
                "active_speaking_minutes": round(active_minutes, 4),
                "avatar_rendering_cost_per_active_minute": 0.0,
                "tts_cost_per_active_minute": 0.0,
                "llm_cost_per_active_minute": 0.0,
                "bandwidth_cost_per_active_minute": 0.0,
                "total_variable_cost_per_active_minute": 0.0,
                "cost_per_minute_inr": 0.0,
                "target_met": True,
                "target_cap_inr": 10.0,
                "mode": "mode_c_text",
                "device_compute_note": "Rendered as client subtitles; zero server GPU"
            }

        if mode == "mode_b_hq":
            render_cost = ILLUSTRATIVE_CLOUD_STREAMING_COST_PER_MIN_INR
            tts_cost = COST_PER_MIN_CLOUD_NEURAL_TTS_INR if use_cloud_tts else 0.0
            total_per_min = render_cost + tts_cost + COST_PER_MIN_BANDWIDTH_INR
            return {
                "active_speaking_minutes": round(active_minutes, 4),
                "avatar_rendering_cost_per_active_minute": render_cost,
                "tts_cost_per_active_minute": round(tts_cost, 4),
                "llm_cost_per_active_minute": 0.0,
                "bandwidth_cost_per_active_minute": COST_PER_MIN_BANDWIDTH_INR,
                "total_variable_cost_per_active_minute": round(total_per_min, 2),
                "cost_per_minute_inr": round(total_per_min, 2),
                "target_met": total_per_min <= 10.0,
                "target_cap_inr": 10.0,
                "mode": "mode_b_hq",
                "cost_classification": "illustrative_baseline"
            }

        # MODE A (Default: Local Nova)
        render_cost = COST_PER_MIN_SERVER_RENDER_MODE_A_INR  # ₹0.00 server GPU
        tts_cost = COST_PER_MIN_CLOUD_NEURAL_TTS_INR if use_cloud_tts else COST_PER_MIN_BROWSER_TTS_INR
        total_per_min = render_cost + tts_cost + COST_PER_MIN_BANDWIDTH_INR

        return {
            "active_speaking_minutes": round(active_minutes, 4),
            "avatar_rendering_cost_per_active_minute": 0.0,
            "tts_cost_per_active_minute": round(tts_cost, 4),
            "llm_cost_per_active_minute": 0.0,
            "bandwidth_cost_per_active_minute": COST_PER_MIN_BANDWIDTH_INR,
            "total_variable_cost_per_active_minute": round(total_per_min, 3),
            "cost_per_minute_inr": round(total_per_min, 3),
            "target_met": total_per_min <= 10.0,
            "target_cap_inr": 10.0,
            "mode": "mode_a_local",
            "cost_classification": "measured_direct_server_cost",
            "device_compute_note": "Client SVG/audio execution runs locally on learner browser; server GPU cost is ₹0.00"
        }


    async def orchestrate_turn(
        self,
        text: str,
        audio: Optional[str] = None,
        actual_audio_duration_ms: Optional[int] = None,
        emotion: Optional[str] = None,
        speaking_style: Optional[str] = None,
        language: Optional[str] = "en",
        mode: Optional[str] = None,
        speech_rate_wpm: int = 150
    ) -> Dict[str, Any]:
        """
        Executes avatar plan generation, tracking backend_avatar_plan_latency_ms
        and recording real failovers.
        """
        request_received_at = time.perf_counter()
        failover_info: Optional[Dict[str, Any]] = None

        requested_mode = mode or self.default_mode
        effective_mode = requested_mode

        # Real failover path: Mode B requested without configured HeyGen credentials
        if requested_mode == "mode_b_hq":
            heygen_key = os.getenv("HEYGEN_API_KEY", "").strip()
            if not heygen_key:
                effective_mode = "mode_a_local"
                failover_info = {
                    "provider_attempted": "heygen_live_avatar",
                    "failure_reason": "HEYGEN_API_KEY_NOT_CONFIGURED",
                    "fallback_mode": "mode_a_local",
                    "fallback_graceful": True
                }

        # Mode C: Text Fallback
        if effective_mode == "mode_c_text":
            backend_plan_latency_ms = round((time.perf_counter() - request_received_at) * 1000.0, 2)
            return {
                "text": text,
                "audio": None,
                "estimated_duration_ms": 0,
                "actual_audio_duration_ms": None,
                "viseme_timeline": [],
                "expression_timeline": [],
                "backend_avatar_plan_latency_ms": backend_plan_latency_ms,
                "render_mode": "mode_c_text",
                "provider": "text_fallback",
                "cost_estimate": self.calculate_cost(0, mode="mode_c_text"),
                "failover": failover_info
            }

        # Timing resolution
        timing = self.timing_provider.get_duration_ms(text, actual_audio_duration_ms)
        effective_duration_ms = timing["effective_duration_ms"]

        # Generate Rhubarb-compatible 2D viseme timeline
        viseme_timeline = viseme_engine.generate_timeline(
            text=text,
            wpm=speech_rate_wpm,
            target_duration_ms=effective_duration_ms
        )

        # Generate contextual expression timeline
        expression_timeline = expression_engine.generate_timeline(
            text=text,
            total_duration_ms=effective_duration_ms,
            emotion_hint=emotion
        )

        backend_plan_latency_ms = round((time.perf_counter() - request_received_at) * 1000.0, 2)
        cost_estimate = self.calculate_cost(duration_ms=effective_duration_ms, mode=effective_mode)

        # Objective Audio-Viseme Alignment Score (Reported as 'Not measured' if actual audio duration missing)
        alignment_data = viseme_engine.score_audio_viseme_alignment(
            timeline=viseme_timeline,
            actual_audio_duration_ms=actual_audio_duration_ms
        )

        # Viseme Timeline Quality Score (heuristic internal check)
        timeline_quality_score = viseme_engine.score_viseme_timeline_quality(viseme_timeline, text)

        provider_name = "rhubarb_compatible_phoneme_timeline" if effective_mode == "mode_a_local" else "remote_stream_avatar"

        return {
            "text": text,
            "audio": audio,
            "estimated_duration_ms": timing["estimated_duration_ms"],
            "actual_audio_duration_ms": timing["actual_audio_duration_ms"],
            "timing_details": timing,
            "viseme_timeline": viseme_timeline,
            "expression_timeline": expression_timeline,
            "backend_avatar_plan_latency_ms": backend_plan_latency_ms,
            "viseme_timeline_quality_score": timeline_quality_score,
            "audio_viseme_alignment": alignment_data,
            "render_mode": effective_mode,
            "provider": provider_name,
            "cost_estimate": cost_estimate,
            "failover": failover_info
        }


avatar_engine = AvatarEngine()
