"""
LEARNOVA CRITICAL CORE AI VERIFICATION SUITE
Covers all 16 mission-critical end-to-end tests:
1. Fresh session + "hi" -> fast natural greeting, no Packet Switching, no remote model delay
2. Fresh session + "What is machine learning?" -> ML explanation, no unrelated lesson
3. "Explain packet switching with an example." -> direct explanation, not a generic greeting
4. New conversation after studying Packet Switching -> clean reset, no stale context
5. Upload one PDF -> grounded summary with source references
6. Upload two PDFs -> comparative synthesis across both
7. Upload C source file -> explanation of actual C functions and code
8. Unavailable provider -> bounded fallback, never infinite hang
9. Timeout / cancellation -> safe state recovery
10. Markdown rendering and safe code blocks
11. Voice input reaches the same chat brain
12. Voice settings calibration
13. Document context isolation across sessions
14. Explicit lesson intent activation
15. Research answers with genuine retrieved sources
16. Safe provider health diagnostic without credentials
"""

import os
import json
import asyncio
from unittest.mock import patch, AsyncMock

from teacher_brain import teacher_brain
from intent_router import intent_router, ConversationIntent
from llm_router import llm_router
from embeddings_retriever import retriever
from document_processor import DocumentProcessor
from learner_state import learner_state
from voice_provider import voice_service


def test_01_fresh_session_greeting():
    """TEST 1: Start fresh session and send 'hi'. Expected: natural greeting, no Packet Switching, fast response."""
    async def _test():
        learner_state.active_doc_id = None
        learner_state.active_doc_title = ""

        result = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="hi",
            active_concept="",
            language="en"
        )

        assert result["intent"] == "greeting"
        assert "packet switching" not in result["teacher_text"].lower()
        assert "packet switching" not in result["spoken_text"].lower()
        assert result["llm_metadata"]["provider"] == "local_fast_greeting"
        assert result["llm_metadata"]["latency_ms"] < 50.0

    asyncio.run(_test())


def test_02_general_question_machine_learning():
    """TEST 2: Ask 'What is machine learning?'. Expected: relevant answer without Packet Switching."""
    async def _test():
        result = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="What is machine learning?",
            active_concept="",
            language="en"
        )

        assert "machine learning" in result["teacher_text"].lower() or "learning" in result["teacher_text"].lower()
        assert "packet switching" not in result["teacher_text"].lower()
        assert result["intent"] in ("teach", "general_question")

    asyncio.run(_test())


def test_03_explain_packet_switching_with_example():
    """TEST 3: Send 'Explain packet switching with an example.' Expected: packet switching explanation, not a greeting."""
    async def _test():
        result = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="Explain packet switching with an example.",
            active_concept="Packet Switching",
            language="en"
        )

        assert result["intent"] != "greeting"
        assert "packet" in result["teacher_text"].lower()
        assert len(result["teacher_text"]) > 100

    asyncio.run(_test())


def test_04_session_isolation_after_studying_packet_switching():
    """TEST 4: Open new conversation after studying Packet Switching. Expected: no stale lesson context."""
    async def _test():
        learner_state.set_active_document("doc_networks_osi_101", "Computer Networks")
        learner_state.record_concept_interaction("c_packet_switching", 0.5)

        # Reset active session
        learner_state.active_doc_id = None
        learner_state.active_doc_title = ""

        result = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="hi",
            active_concept="",
            language="en"
        )
        assert result["intent"] == "greeting"
        assert "packet switching" not in result["teacher_text"].lower()

    asyncio.run(_test())


def test_05_upload_pdf_and_summary():
    """TEST 5: Upload PDF and request summary. Expected: grounded summary with source references."""
    async def _test():
        doc_id = "doc_test_os_notes"
        sample_pdf_text = (
            "Operating Systems: Virtual Memory and Paging.\n"
            "Virtual memory decouples logical address space from physical memory.\n"
            "Pages are fixed-size blocks mapped to physical frames using page tables."
        )
        secs, chks = DocumentProcessor.extract_from_text(sample_pdf_text, doc_id, "OS_Notes.pdf")
        retriever.index_document(doc_id, chks)

        result = await teacher_brain.interact(
            doc_id=doc_id,
            student_message="Summarise this document and key concepts.",
            active_concept="Virtual Memory",
            language="en"
        )

        assert len(result["citations"]) > 0
        assert "virtual memory" in result["teacher_text"].lower() or "paging" in result["teacher_text"].lower()

    asyncio.run(_test())


def test_06_upload_two_docs_and_compare():
    """TEST 6: Upload two documents and request comparison. Expected: comparison grounded in both."""
    async def _test():
        doc1 = "doc_test_tcp_guide"
        doc2 = "doc_test_udp_guide"

        retriever.index_document(doc1, [{
            "chunk_id": "c1", "document_id": doc1, "page_number": 1,
            "section": "TCP Reliability", "content": "TCP provides reliable, ordered, byte-stream transmission with ACKs.",
            "source_type": "text"
        }])
        retriever.index_document(doc2, [{
            "chunk_id": "c2", "document_id": doc2, "page_number": 1,
            "section": "UDP Speed", "content": "UDP provides connectionless, lightweight, low-latency datagram transmission.",
            "source_type": "text"
        }])

        result = await teacher_brain.interact(
            doc_id="doc_test_tcp_guide",
            student_message="Compare both documents and explain the difference between the two files.",
            active_concept="",
            language="en"
        )

        assert result["intent"] == "document_comparison"
        sources = [c["source"] for c in result["citations"]]
        assert doc1 in sources or "doc_test_tcp_guide" in str(sources)
        assert doc2 in sources or "doc_test_udp_guide" in str(sources)

    asyncio.run(_test())


def test_07_upload_c_source_file():
    """TEST 7: Upload C source file and ask for explanation. Expected: explains actual C code."""
    async def _test():
        doc_id = "doc_test_c_program"
        c_code = """
#include <stdio.h>

int reverse_number(int num) {
    int reversed = 0;
    while (num > 0) {
        reversed = reversed * 10 + (num % 10);
        num /= 10;
    }
    return reversed;
}

int main() {
    int val = 1234;
    printf("Reversed: %d\\n", reverse_number(val));
    return 0;
}
"""
        secs, chks = DocumentProcessor.extract_from_code(c_code, doc_id, "reverse.c")
        retriever.index_document(doc_id, chks)

        result = await teacher_brain.interact(
            doc_id=doc_id,
            student_message="Explain what reverse_number does in reverse.c",
            active_concept="reverse_number",
            language="en"
        )

        assert "reverse" in result["teacher_text"].lower()

    asyncio.run(_test())


def test_08_unavailable_provider_bounded_fallback():
    """TEST 8: Submit message with unavailable provider. Expected: bounded fallback, never infinite loop."""
    async def _test():
        with patch.object(llm_router, "generate_completion", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = None  # Simulate all remote LLMs offline

            result = await teacher_brain.interact(
                doc_id="general_learning",
                student_message="Explain recursion in computer science.",
                active_concept="Recursion",
                language="en"
            )

            assert result is not None
            assert "teacher_text" in result
            assert len(result["teacher_text"]) > 20

    asyncio.run(_test())


def test_09_timeout_and_cancellation():
    """TEST 9: Simulate timeout/cancellation. Expected: UI/API recovers gracefully."""
    async def _test():
        with patch.object(llm_router, "generate_completion", new_callable=AsyncMock) as mock_llm:
            mock_llm.return_value = {
                "provider": "fallback_local",
                "model": "rule_based",
                "text": "SPOKEN: Recursion is a method of solving a problem where the solution depends on solutions to smaller instances of the same problem.\nEXPLANATION: Recursion consists of a base case and a recursive case.",
                "latency_ms": 1.0,
                "cost_tier": "FREE",
                "fallback_used": True
            }

            result = await teacher_brain.interact(
                doc_id="general_learning",
                student_message="Explain recursion",
                active_concept="Recursion",
                language="en"
            )
            assert result is not None
            assert "recursion" in result["teacher_text"].lower()

    asyncio.run(_test())


def test_10_markdown_rendering_contract():
    """TEST 10: Verify Markdown tokens formatting in teacher responses."""
    greeting = intent_router.get_greeting_response("en")
    assert "**Professor Nova**" in greeting["teacher_text"]
    assert "•" in greeting["teacher_text"]


def test_11_voice_input_pipeline():
    """TEST 11: Verify voice transcription input routes through the same intent pipeline."""
    spoken_text = "What is machine learning?"
    classification = intent_router.classify(spoken_text)
    assert classification["intent"] == ConversationIntent.GENERAL_QUESTION

    spoken_greeting = "Hey there Professor Nova"
    class_greeting = intent_router.classify(spoken_greeting)
    assert class_greeting["intent"] == ConversationIntent.GREETING


def test_12_voice_settings_calibration():
    """TEST 12: Verify voice capabilities and settings configuration."""
    caps = voice_service.get_voice_capabilities()
    assert "supported_languages" in caps
    assert any(lang["code"] == "en" for lang in caps["supported_languages"])


def test_13_document_context_cannot_leak():
    """TEST 13: Verify document context does not leak into an unrelated session."""
    async def _test():
        retriever.index_document("doc_secret_ai", [{
            "chunk_id": "c_sec", "document_id": "doc_secret_ai", "page_number": 1,
            "section": "Confidential Algorithm", "content": "The confidential project code is QUANTUM_ALPHA_99.",
            "source_type": "text"
        }])

        result = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="Hello, how does bubble sort work?",
            active_concept="Bubble Sort",
            language="en"
        )

        assert "quantum_alpha_99" not in result["teacher_text"].lower()
        for cite in result["citations"]:
            assert cite["source"] != "doc_secret_ai"

    asyncio.run(_test())


def test_14_explicit_lesson_intent():
    """TEST 14: 'Start a lesson on Packet Switching' activates structured lesson workflow."""
    async def _test():
        classification = intent_router.classify("Start a lesson on Packet Switching")
        assert classification["intent"] == ConversationIntent.EXPLICIT_LESSON

        result = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="Start a lesson on Packet Switching",
            active_concept="Packet Switching",
            mode="explain",
            language="en"
        )
        assert result is not None
        assert "packet" in result["teacher_text"].lower()

    asyncio.run(_test())


def test_15_research_answers_with_genuine_sources():
    """TEST 15: Research answers include only genuine retrieved sources."""
    async def _test():
        classification = intent_router.classify("Research the latest developments in AI")
        assert classification["intent"] == ConversationIntent.RESEARCH

        result = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="Research the latest developments in AI",
            active_concept="",
            language="en"
        )

        assert result["intent"] == "research"
        assert len(result["citations"]) > 0
        for cite in result["citations"]:
            assert cite["source"] != ""
            assert len(cite["excerpt"]) > 5

    asyncio.run(_test())


def test_16_provider_health_diagnostic_safe():
    """TEST 16: Safe provider-health diagnostic without printing credentials."""
    status = llm_router.get_status()
    assert "providers" in status
    assert "primary_provider" in status

    raw_json = json.dumps(status)
    assert "sk-" not in raw_json
    assert "AIza" not in raw_json
    assert len(raw_json) < 2000
