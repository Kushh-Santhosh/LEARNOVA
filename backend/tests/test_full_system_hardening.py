import pytest
import asyncio
import os
import json
from httpx import AsyncClient, ASGITransport
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app, DOCUMENTS
from screen_understanding import screen_service
from services.avatar_engine import avatar_engine
from services.avatar_benchmark import avatar_benchmark_service
from openrouter_router import openrouter_router


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_screen_step_verification_and_rejection():
    """Verify that valid actions advance steps, while wrong routes/targets are strictly rejected."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Correct user action: on documents route
        valid_res = await client.post("/api/screen/verify-step", json={
            "workflow": "upload_document",
            "step_number": 1,
            "current_route": "documents",
            "user_action": "clicked",
            "dom_evidence": {"clicked_id": "nav-documents", "target_clicked": True}
        })
        assert valid_res.status_code == 200
        valid_data = valid_res.json()
        assert valid_data["verified"] is True
        assert valid_data["status"] == "STEP_COMPLETED"
        assert valid_data["next_step"] == 2

        # 2. INCORRECT user action: user clicked knowledge instead of documents
        wrong_route_res = await client.post("/api/screen/verify-step", json={
            "workflow": "upload_document",
            "step_number": 1,
            "current_route": "knowledge",
            "user_action": "clicked",
            "dom_evidence": {"clicked_id": "nav-knowledge", "target_clicked": False}
        })
        assert wrong_route_res.status_code == 200
        wrong_data = wrong_route_res.json()
        assert wrong_data["verified"] is False
        assert wrong_data["status"] == "NEEDS_CONFIRMATION"
        assert "Looking for Documents" in wrong_data["message"]

        # 3. Mismatched target ID on same route
        wrong_target_res = await client.post("/api/screen/verify-step", json={
            "workflow": "upload_document",
            "step_number": 1,
            "current_route": "documents",
            "user_action": "clicked",
            "dom_evidence": {"clicked_id": "btn-other-unrelated", "target_clicked": False}
        })
        assert wrong_target_res.status_code == 200
        wrong_target_data = wrong_target_res.json()
        assert wrong_target_data["verified"] is False
        assert wrong_target_data["status"] == "NEEDS_CONFIRMATION"


@pytest.mark.anyio
async def test_two_document_grounding_and_isolation():
    """
    Test two completely different subjects (Operating Systems vs Cell Biology).
    Verify that:
    1. Answers change based on active document.
    2. Zero accidental fallback to demo TCP/UDP material.
    3. Off-document questions are handled with appropriate intent and zero demo leakage.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Check docs
        docs_res = await client.get("/api/documents")
        assert docs_res.status_code == 200
        docs = docs_res.json()

        # Ensure Document A (OS) exists
        os_doc = next((d for d in docs if "operating_systems" in d["id"]), None)
        if not os_doc:
            with open("backend/uploads/operating_systems_principles.pdf", "rb") as f:
                r = await client.post("/api/documents/upload", files={"file": ("operating_systems_principles.pdf", f, "application/pdf")})
                os_doc = r.json()["document"]

        # Ensure Document B (Cell Biology) exists
        bio_doc = next((d for d in docs if "cell_biology" in d["id"]), None)
        if not bio_doc:
            with open("backend/uploads/cell_biology_and_genetics.pdf", "rb") as f:
                r = await client.post("/api/documents/upload", files={"file": ("cell_biology_and_genetics.pdf", f, "application/pdf")})
                bio_doc = r.json()["document"]

        assert os_doc is not None
        assert bio_doc is not None

        # 1. Ask OS question against Document A
        teach_os = (await client.post("/api/teach", json={
            "document_id": os_doc["id"],
            "message": "Explain kernel architectures, system calls, and context switching.",
            "mode": "explain"
        })).json()

        os_content = (teach_os.get("teacher_text", "") + " " + teach_os.get("spoken_text", "")).lower()
        assert any(k in os_content for k in ["kernel", "system call", "interrupt", "ring", "switch", "os"])
        # CRITICAL: zero TCP / UDP demo contamination
        assert "tcp" not in os_content and "handshake" not in os_content and "udp" not in os_content

        # 2. Ask Biology question against Document B
        teach_bio = (await client.post("/api/teach", json={
            "document_id": bio_doc["id"],
            "message": "Explain the role and architecture of the cell nucleus and chromosomes.",
            "mode": "explain"
        })).json()

        bio_content = (teach_bio.get("teacher_text", "") + " " + teach_bio.get("spoken_text", "")).lower()
        assert any(k in bio_content for k in ["nucleus", "cell", "dna", "chromatin", "organelle"])
        # CRITICAL: zero OS or TCP demo contamination
        assert "kernel" not in bio_content and "tcp" not in bio_content and "handshake" not in bio_content

        # 3. Ask identical conceptual question against both and verify answers diverge
        same_q = "What is the primary role of the central core in organizing operations?"
        ans_os = (await client.post("/api/teach", json={
            "document_id": os_doc["id"],
            "message": same_q,
            "mode": "explain"
        })).json()
        ans_bio = (await client.post("/api/teach", json={
            "document_id": bio_doc["id"],
            "message": same_q,
            "mode": "explain"
        })).json()

        text_os = ans_os.get("teacher_text", "").lower()
        text_bio = ans_bio.get("teacher_text", "").lower()
        assert text_os != text_bio
        assert "kernel" in text_os or "operating" in text_os or "system" in text_os
        assert "nucleus" in text_bio or "cell" in text_bio or "dna" in text_bio

        # 4. Off-document question test
        teach_off = (await client.post("/api/teach", json={
            "document_id": os_doc["id"],
            "message": "How do airplanes generate aerodynamic lift with Bernoulli principle?",
            "mode": "explain"
        })).json()
        off_text = (teach_off.get("teacher_text", "") + " " + teach_off.get("spoken_text", "")).lower()
        # Verify it doesn't hallucinate TCP/UDP
        assert "tcp" not in off_text and "handshake" not in off_text


@pytest.mark.anyio
async def test_quiz_grounding_regression():
    """Verify quiz generation strictly isolates Document A and Document B."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Quiz for OS
        quiz_os_res = await client.post("/api/quiz/generate", json={
            "document_id": "doc_operating_systems_principles",
            "concept": "Virtual Memory"
        })
        assert quiz_os_res.status_code == 200
        quiz_os = quiz_os_res.json()
        quiz_os_str = json.dumps(quiz_os).lower()
        assert "mitochondria" not in quiz_os_str and "ribosome" not in quiz_os_str

        # Quiz for Cell Biology
        quiz_bio_res = await client.post("/api/quiz/generate", json={
            "document_id": "doc_cell_biology_and_genetics",
            "concept": "Mitochondria"
        })
        assert quiz_bio_res.status_code == 200
        quiz_bio = quiz_bio_res.json()
        quiz_bio_str = json.dumps(quiz_bio).lower()
        assert "kernel" not in quiz_bio_str and "scheduling" not in quiz_bio_str


@pytest.mark.anyio
async def test_teacher_brain_pedagogical_modes():
    """Test representative teaching modes produce valid structured responses without crashing."""
    transport = ASGITransport(app=app)
    modes = ["explain", "socratic", "analogy"]
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for mode in modes:
            res = await client.post("/api/teach", json={
                "document_id": "doc_operating_systems_principles",
                "message": "How do system calls protect the operating system?",
                "mode": mode
            })
            assert res.status_code == 200
            data = res.json()
            assert "teacher_text" in data
            assert len(data["teacher_text"]) > 0


@pytest.mark.anyio
async def test_multilingual_support():
    """Test multilingual generation across representative regional languages."""
    transport = ASGITransport(app=app)
    languages = [("hi", "Hindi"), ("kn", "Kannada")]
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        for lang_code, name in languages:
            res = await client.post("/api/teach", json={
                "document_id": "doc_operating_systems_principles",
                "message": "What is an operating system?",
                "mode": "explain",
                "language": lang_code
            })
            assert res.status_code == 200
            data = res.json()
            assert len(data.get("teacher_text", "")) > 0


@pytest.mark.anyio
async def test_openrouter_free_only_guard():
    """Verify that only 100% free models are eligible and zero paid models can be selected."""
    models = await openrouter_router.discover_free_models(force_refresh=False)
    assert len(models) > 0
    for m in models:
        assert m.get("prompt_price") == 0.0
        assert m.get("completion_price") == 0.0


@pytest.mark.anyio
async def test_avatar_mode_b_graceful_failover():
    """Verify that Mode B gracefully falls back to local engine with clear status flag."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.post("/api/avatar/speak", json={
            "text": "LEARNOVA resilient avatar engine verification.",
            "mode": "mode_b_hq"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["render_mode"] == "mode_a_local"
        assert data["failover"] is not None
        assert data["failover"]["fallback_mode"] == "mode_a_local"
        assert len(data["viseme_timeline"]) > 0


@pytest.mark.anyio
async def test_avatar_benchmark_metrics_integrity():
    """Verify benchmark metrics: zero fabrication, transparent labels, honest direct server cost."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/api/avatar/benchmark")
        assert res.status_code == 200
        data = res.json()
        assert data["total_cases"] >= 10
        assert "statistics" in data
        cost_stats = data["statistics"]["total_variable_cost_per_minute_inr"]
        assert cost_stats["server_avatar_rendering_cost_inr"] == 0.0
        assert cost_stats["target_achieved"] is True
        assert "comparison" in data
        assert data["comparison"]["baseline"]["baseline_type"] == "illustrative_published_rate"
        assert data["comparison"]["optimized"]["baseline_type"] == "measured_direct_server_performance"
        assert data["comparison"]["optimized"]["server_gpu_dependency"] is False
        assert data["comparison"]["optimized"]["target_met"] is True


@pytest.mark.anyio
async def test_api_robustness_and_invalid_inputs():
    """Verify graceful handling for invalid inputs and edge cases."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Nonexistent document
        r_doc = await client.get("/api/documents/nonexistent_xyz/knowledge-graph")
        assert r_doc.status_code in [200, 404]

        # Empty teach message
        r_empty = await client.post("/api/teach", json={
            "document_id": "doc_operating_systems_principles",
            "message": "    ",
            "mode": "explain"
        })
        assert r_empty.status_code == 200
        assert len(r_empty.json().get("teacher_text", "")) > 0

        # Unsupported avatar mode falls back to local engine safely
        r_mode = await client.post("/api/avatar/speak", json={
            "text": "Testing unsupported mode.",
            "mode": "invalid_experimental_3d_mode"
        })
        assert r_mode.status_code == 200
        assert r_mode.json()["render_mode"] == "mode_a_local"
