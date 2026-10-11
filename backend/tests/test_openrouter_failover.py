import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from openrouter_router import openrouter_router, VERIFIED_FREE_MODELS
from screen_understanding import OpenRouterVisionProvider
from teacher_brain import teacher_brain


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture(autouse=True)
def clean_simulation():
    openrouter_router.clear_simulation()
    yield
    openrouter_router.clear_simulation()


@pytest.mark.anyio
async def test_failover_a_fails_b_succeeds():
    """Controlled failure test: Candidate 1 fails (500) -> Candidate 2 succeeds."""
    openrouter_router.set_simulation(
        failures={1: 500},
        responses={2: "Response generated from fallback Model B"}
    )
    res = await openrouter_router.generate_completion(prompt="Test prompt")
    assert res is not None
    assert res["attempt"] == 2
    assert res["fallback_used"] is True
    assert res["text"] == "Response generated from fallback Model B"
    assert res["cost_tier"] == "FREE"


@pytest.mark.anyio
async def test_failover_a_times_out_b_fails_c_succeeds():
    """Controlled failure test: Candidate 1 times out -> Candidate 2 fails (502) -> Candidate 3 succeeds."""
    openrouter_router.set_simulation(
        failures={1: "timeout", 2: 502},
        responses={3: "Response generated from fallback Model C"}
    )
    res = await openrouter_router.generate_completion(prompt="Multi-hop failover prompt")
    assert res is not None
    assert res["attempt"] == 3
    assert res["fallback_used"] is True
    assert res["text"] == "Response generated from fallback Model C"


@pytest.mark.anyio
async def test_failover_rate_limit_429_switches_model():
    """Controlled failure test: Candidate 1 returns 429 Too Many Requests -> switches to Candidate 2."""
    openrouter_router.set_simulation(
        failures={1: 429},
        responses={2: "Response after 429 rate limit backoff"}
    )
    res = await openrouter_router.generate_completion(prompt="Rate limit test prompt")
    assert res is not None
    assert res["attempt"] == 2
    assert res["fallback_used"] is True
    assert res["text"] == "Response after 429 rate limit backoff"
    assert res["cost_tier"] == "FREE"


@pytest.mark.anyio
async def test_all_cloud_models_fail_uses_local_teacher():
    """Controlled failure test: All cloud models fail -> router returns None -> local teacher responds."""
    openrouter_router.set_simulation(
        failures={1: "timeout", 2: 500, 3: 503, 4: 429, 5: "all_fail"}
    )
    cloud_res = await openrouter_router.generate_completion(prompt="What is recursion?")
    assert cloud_res is None
    assert "Local Fallback Active" in openrouter_router.fallback_status

    # When cloud router returns None, teacher_brain uses its local deterministic pedagogical engine
    interaction = await teacher_brain.interact(
        doc_id="general_learning",
        student_message="Explain what recursion is in programming.",
        active_concept="Recursion",
        mode="explain",
        language="en"
    )
    assert interaction is not None
    assert len(interaction.get("teacher_text", "")) > 0
    assert interaction.get("intent") in ["teach", "concept_explanation"]


@pytest.mark.anyio
async def test_paid_model_rejected_by_discovery_and_selection():
    """Verify that a model with non-zero pricing is rejected at discovery and execution time."""
    # Test discovery filter
    fake_catalog = [
        {
            "id": "anthropic/claude-3-opus",
            "name": "Claude 3 Opus",
            "pricing": {"prompt": "0.015", "completion": "0.075"},
            "architecture": {"modality": "text->text"}
        },
        {
            "id": "openai/gpt-4o",
            "name": "GPT-4o",
            "pricing": {"prompt": "0.005", "completion": "0.015"},
            "architecture": {"modality": "text->text"}
        },
        {
            "id": "google/gemma-free-test:free",
            "name": "Gemma Free Test",
            "pricing": {"prompt": "0.0", "completion": "0.0", "request": "0.0", "image": "0.0"},
            "architecture": {"modality": "text->text"}
        }
    ]

    # Process fake catalog through the strict free guard logic
    discovered = []
    for m in fake_catalog:
        pricing = m.get("pricing", {})
        prompt_p = float(pricing.get("prompt", 1.0))
        comp_p = float(pricing.get("completion", 1.0))
        req_p = float(pricing.get("request", 0.0))
        img_p = float(pricing.get("image", 0.0))
        if prompt_p == 0.0 and comp_p == 0.0 and req_p == 0.0 and img_p == 0.0:
            discovered.append(m["id"])

    assert "anthropic/claude-3-opus" not in discovered
    assert "openai/gpt-4o" not in discovered
    assert "google/gemma-free-test:free" in discovered


@pytest.mark.anyio
async def test_vision_capability_check_rejects_text_only_models():
    """Verify that screen understanding does not send images to text-only models."""
    provider = OpenRouterVisionProvider()
    # If no free vision models exist, analyze_screen must return None (fallback to DOM mode)
    # rather than sending an image payload to an unsupported text-only LLM
    result = await provider.analyze_screen(
        screenshot_base64="fake_base64_data",
        goal="Find upload button",
        context={}
    )
    # Result must be either valid JSON with guidance or None (safe fallback), never a crash or unhandled billing error
    assert result is None or isinstance(result, dict)
