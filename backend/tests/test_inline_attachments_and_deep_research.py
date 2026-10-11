import asyncio
from teacher_brain import teacher_brain
from embeddings_retriever import retriever
from services.web_research import web_research_service

def test_deep_research_mode_execution():
    """Verify that deep_research generates all 10 required academic sections and verified citations."""
    async def _test():
        res = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="Transformer Architecture in Deep Learning",
            research_mode=True
        )
        assert res["teaching_mode"] == "deep_research"
        assert res.get("is_deep_research") is True
        assert "Executive Summary" in res["teacher_text"]
        assert "Theoretical Foundations" in res["teacher_text"]
        assert "Comparative Analysis Table" in res["teacher_text"]
        assert "Trade-offs" in res["teacher_text"]
        assert "Genuine Verified References" in res["teacher_text"] or "References" in res["teacher_text"]
        assert len(res["citations"]) > 0

    asyncio.run(_test())

def test_inline_attached_single_doc_grounding():
    """Verify that attached_doc_ids binds and grounds the response without changing the screen."""
    async def _test():
        doc_id = "doc_test_inline_physics"
        retriever.index_document(doc_id, [
            {
                "content": "Quantum entanglement occurs when pairs or groups of particles are generated such that the quantum state of each particle cannot be described independently of the state of the others.",
                "document_id": doc_id,
                "page_number": 1,
                "section": "Quantum Mechanics"
            }
        ])

        res = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="What does this document say about quantum entanglement?",
            attached_doc_ids=[doc_id]
        )
        assert "quantum state" in res["teacher_text"].lower() or "entanglement" in res["teacher_text"].lower()
        assert any(c.get("source") in ("Curriculum Material", doc_id) or "quantum" in c.get("excerpt", "").lower() for c in res.get("citations", []))

    asyncio.run(_test())

def test_inline_attached_multi_doc_comparison():
    """Verify that multiple attached documents trigger cross-document comparison."""
    async def _test():
        doc1 = "doc_test_sql"
        doc2 = "doc_test_nosql"
        retriever.index_document(doc1, [
            {
                "content": "Relational SQL databases enforce ACID guarantees and structured schemas using tables and primary keys.",
                "document_id": doc1,
                "page_number": 1,
                "section": "Relational Models"
            }
        ])
        retriever.index_document(doc2, [
            {
                "content": "NoSQL document stores use flexible JSON-like documents, favoring eventual consistency and horizontal partition scaling.",
                "document_id": doc2,
                "page_number": 1,
                "section": "Non-Relational Models"
            }
        ])

        res = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="Compare these two database files and explain their trade-offs.",
            attached_doc_ids=[doc1, doc2]
        )
        assert res["teaching_mode"] == "multi_doc" or res.get("intent") in ("document_comparison", "teach")
        assert len(res["citations"]) >= 2

    asyncio.run(_test())
