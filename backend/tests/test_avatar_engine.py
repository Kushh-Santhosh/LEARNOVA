"""
LEARNOVA Avatar Engine & Benchmark Test Suite
Validates:
  - Deterministic phonetic Rhubarb 2D viseme generation (Shapes A-H, X)
  - Absence of Math.sin / Math.random in viseme timing
  - Pedagogical multi-stage expression curves
  - Cost calculations vs <= ₹10/min target
  - Benchmark execution across fixtures
  - Mode A (local), Mode B (HQ), Mode C (text fallback)
"""

import sys
import os
import pytest
import asyncio

# Setup path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.viseme_engine import viseme_engine, PHONEME_TO_VISEME
from services.expression_engine import expression_engine, VALID_EXPRESSIONS
from services.avatar_engine import avatar_engine
from services.avatar_benchmark import avatar_benchmark_service


def test_viseme_engine_rhubarb_shapes():
    """Verify generated shapes strictly belong to Rhubarb standard set."""
    valid_shapes = {"A", "B", "C", "D", "E", "F", "G", "H", "X"}
    sample_text = "Hello! Today we will learn about Python dictionaries and network protocols."
    timeline = viseme_engine.generate_timeline(sample_text, wpm=150)
    
    assert len(timeline) > 10, "Timeline should contain multiple viseme events"
    shapes_found = set(ev["shape"] for ev in timeline)
    assert shapes_found.issubset(valid_shapes), f"Found non-Rhubarb shapes: {shapes_found - valid_shapes}"
    
    # Check that events have non-zero durations and strictly increasing start timestamps
    last_end = 0
    for ev in timeline:
        assert ev["at_ms"] >= last_end - 50, f"Overlapping or out-of-order event: {ev}"
        assert ev["duration_ms"] > 0, f"Zero duration event: {ev}"
        last_end = ev["at_ms"] + ev["duration_ms"]


def test_viseme_engine_no_randomness():
    """Verify viseme timeline generation is 100% deterministic (no Math.random)."""
    text = "In computer networking, the transmission control protocol provides reliable delivery."
    t1 = viseme_engine.generate_timeline(text, wpm=150)
    t2 = viseme_engine.generate_timeline(text, wpm=150)
    
    assert len(t1) == len(t2), "Timeline lengths must be identical"
    for e1, e2 in zip(t1, t2):
        assert e1["at_ms"] == e2["at_ms"]
        assert e1["duration_ms"] == e2["duration_ms"]
        assert e1["shape"] == e2["shape"]


def test_expression_engine_contextual_curves():
    """Verify facial expressions match text pedagogy and tone."""
    # Question text
    q_timeline = expression_engine.generate_timeline(
        "Why does TCP use a three-way handshake?", total_duration_ms=2500
    )
    assert any(ev["expression"] == "questioning" for ev in q_timeline)

    # Praise text
    p_timeline = expression_engine.generate_timeline(
        "Brilliant job! You got 100% on the quiz!", total_duration_ms=2500
    )
    assert any(ev["expression"] in ("celebrating", "encouraging") for ev in p_timeline)

    # Remediation text
    r_timeline = expression_engine.generate_timeline(
        "Common misconception: HTTP is not transport layer. Let's clarify.", total_duration_ms=3500
    )
    assert any(ev["expression"] == "remediating" for ev in r_timeline)


def test_avatar_engine_cost_target():
    """Verify Mode A cost meets <= ₹10/min active speaking time target."""
    cost_a = avatar_engine.calculate_cost(duration_ms=60000, mode="mode_a_local")
    assert cost_a["cost_per_minute_inr"] <= 10.0, f"Cost {cost_a['cost_per_minute_inr']} exceeds ₹10/min"
    assert cost_a["target_met"] is True

    # Mode C text fallback cost is ₹0
    cost_c = avatar_engine.calculate_cost(duration_ms=0, mode="mode_c_text")
    assert cost_c["cost_per_minute_inr"] == 0.0
    assert cost_c["target_met"] is True


def test_avatar_engine_orchestration_modes():
    """Verify turn orchestration, timing separation, and failover across modes."""
    # Mode A (Local Nova)
    turn_a = asyncio.run(avatar_engine.orchestrate_turn(
        text="Welcome to LEARNOVA! Let's explore algorithms.",
        mode="mode_a_local"
    ))
    assert turn_a["render_mode"] == "mode_a_local"
    assert len(turn_a["viseme_timeline"]) > 5
    assert len(turn_a["expression_timeline"]) >= 1
    assert turn_a["backend_avatar_plan_latency_ms"] < 150.0
    assert turn_a["audio_viseme_alignment"]["measured"] is False
    assert turn_a["audio_viseme_alignment"]["status"].startswith("Not measured")

    # Mode A with actual audio duration provided
    turn_audio = asyncio.run(avatar_engine.orchestrate_turn(
        text="Welcome to LEARNOVA!",
        mode="mode_a_local",
        actual_audio_duration_ms=2100
    ))
    assert turn_audio["audio_viseme_alignment"]["measured"] is True
    assert turn_audio["actual_audio_duration_ms"] == 2100

    # Mode B without API key -> real graceful failover to Mode A
    turn_b = asyncio.run(avatar_engine.orchestrate_turn(
        text="Testing cloud failover.",
        mode="mode_b_hq"
    ))
    assert turn_b["render_mode"] == "mode_a_local"
    assert turn_b["failover"] is not None
    assert turn_b["failover"]["fallback_mode"] == "mode_a_local"

    # Mode C (Text Fallback)
    turn_c = asyncio.run(avatar_engine.orchestrate_turn(
        text="Quick text fallback.",
        mode="mode_c_text"
    ))
    assert turn_c["render_mode"] == "mode_c_text"
    assert turn_c["estimated_duration_ms"] == 0
    assert turn_c["viseme_timeline"] == []


def test_avatar_benchmark_suite():
    """Verify benchmark loads fixtures and runs cleanly with honest statistical calculations."""
    res = asyncio.run(avatar_benchmark_service.run_full_benchmark(mode="mode_a_local"))
    assert res["total_cases"] >= 10
    assert res["successful_cases"] == res["total_cases"]
    assert res["failure_count"] == 0
    assert "statistics" in res
    assert res["statistics"]["total_variable_cost_per_minute_inr"]["target_achieved"] is True
    assert len(res["raw_cases"]) == res["total_cases"]
    assert res["comparison"]["baseline"]["baseline_type"] == "illustrative_published_rate"
    assert res["comparison"]["optimized"]["baseline_type"] == "measured_direct_server_performance"

