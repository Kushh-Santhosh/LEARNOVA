import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.supabase_persistence import supabase_service


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_supabase_connection_test_does_not_leak_secrets():
    """Verify test_connection executes safely, reports honest status, and never exposes keys."""
    res = await supabase_service.test_connection()
    assert isinstance(res, dict)
    assert "status" in res
    assert "fallback_active" in res

    # Zero secrets in output
    for key, val in res.items():
        if isinstance(val, str):
            assert "sk-" not in val
            assert "eyJ" not in val
            assert "secret" not in val.lower() or "service_role" in val.lower() or "secret" not in key.lower()


@pytest.mark.anyio
async def test_supabase_entity_persistence_and_fallback():
    """Verify local in-memory fallback persists entities smoothly when Supabase is in fallback mode."""
    # 1. User Profile
    user = await supabase_service.save_user_profile({
        "id": "test_user_42",
        "display_name": "Ada Lovelace",
        "education_level": "postgraduate",
        "learning_level": "advanced",
        "preferred_style": "feynman_technique",
        "language": "en"
    })
    assert user["id"] == "test_user_42"
    assert user["display_name"] == "Ada Lovelace"

    # 2. Conversation
    conv = await supabase_service.save_conversation(
        conversation_id="conv_101",
        doc_id="doc_operating_systems_principles",
        title="Kernel Architectures Discussion"
    )
    assert conv["id"] == "conv_101"
    assert conv["title"] == "Kernel Architectures Discussion"

    # 3. Message
    msg = await supabase_service.save_message({
        "id": "msg_001",
        "conversation_id": "conv_101",
        "sender": "student",
        "content": "What is the difference between monolithic and microkernel?",
        "intent": "question"
    })
    assert msg["id"] == "msg_001"

    # 4. Progress
    prog = await supabase_service.save_progress(
        concept="Virtual Memory",
        score=0.95,
        is_correct=True
    )
    assert prog["concept_name"] == "Virtual Memory"
    assert prog["mastery_score"] > 0.0

    # 5. Screen Guidance Session (zero screenshots stored)
    session = await supabase_service.save_guidance_session({
        "workflow": "upload_document",
        "status": "COMPLETED",
        "step_number": 3
    })
    assert session["workflow"] == "upload_document"
    assert "screenshot" not in session

    # Status check
    status = supabase_service.get_status()
    assert status["fallback_active"] is True
    assert status["records_cached"]["users"] >= 1
    assert status["records_cached"]["conversations"] >= 1
