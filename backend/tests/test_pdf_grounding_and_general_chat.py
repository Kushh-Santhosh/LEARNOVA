import asyncio
import os
import pytest
from teacher_brain import teacher_brain
from embeddings_retriever import retriever
from intent_router import intent_router, ConversationIntent
from document_processor import DocumentProcessor

def setup_module():
    """Ensure Rajaji Nagar Bill 2026.pdf is parsed and indexed for tests."""
    pdf_path = os.path.join(os.path.dirname(__file__), "..", "uploads", "Rajaji Nagar Bill 2026.pdf")
    doc_id = "doc_rajaji_nagar_bill_2026.pdf"
    if os.path.exists(pdf_path):
        _, chunks = DocumentProcessor.extract_from_pdf(pdf_path, doc_id)
        retriever.index_document(doc_id, chunks)

def test_intent_routing_pdf_vs_general_chat():
    """Verify intent router cleanly distinguishes PDF rate queries from general inquiries."""
    doc_query = "explain me about this pdf and rates in it"
    res = intent_router.classify(doc_query, active_doc_id="doc_rajaji_nagar_bill_2026.pdf", uploaded_doc_count=1)
    assert res["intent"] == ConversationIntent.DOCUMENT_QUESTION
    assert res["requires_document"] is True

    general_query = "say me about cmr university"
    res_gen = intent_router.classify(general_query, active_doc_id="doc_rajaji_nagar_bill_2026.pdf", uploaded_doc_count=1)
    assert res_gen["intent"] == ConversationIntent.GENERAL_QUESTION
    assert res_gen["requires_document"] is False

    general_ram = "what is RAM?"
    res_ram = intent_router.classify(general_ram, active_doc_id="doc_rajaji_nagar_bill_2026.pdf", uploaded_doc_count=1)
    assert res_ram["intent"] == ConversationIntent.GENERAL_QUESTION
    assert res_ram["requires_document"] is False

def test_rajaji_nagar_bill_pdf_grounding_and_rates():
    """Test 1: Verify Professor Nova extracts rates and structured breakdown from Rajaji Nagar Bill 2026.pdf."""
    async def _run():
        doc_id = "doc_rajaji_nagar_bill_2026.pdf"
        res = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="explain me about this pdf and rates in it",
            attached_doc_ids=[doc_id]
        )
        assert res.get("teaching_mode") != "off_document_warning"
        teacher_text = res["teacher_text"]
        assert "Not Found in Uploaded Material" not in teacher_text
        # Verify rates or grand total present
        assert "6,000" in teacher_text or "7,080" in teacher_text or "Rate" in teacher_text
        assert len(res.get("citations", [])) > 0

    asyncio.run(_run())

def test_general_chat_with_pdf_attached_no_rejection_no_leakage():
    """Test 2 & 3: Normal question 'say me about cmr university' succeeds with attached PDF without leakage or error."""
    async def _run():
        doc_id = "doc_rajaji_nagar_bill_2026.pdf"
        res = await teacher_brain.interact(
            doc_id="general_learning",
            student_message="say me about cmr university",
            attached_doc_ids=[doc_id]
        )
        assert res.get("teaching_mode") != "off_document_warning"
        teacher_text = res["teacher_text"]
        # Must not reject with off-document error
        assert "Not Found in Uploaded Material" not in teacher_text
        # Must answer about CMR University
        assert "cmr" in teacher_text.lower() or "university" in teacher_text.lower()
        # Must NOT leak financial invoice particulars
        assert "tax invoice" not in teacher_text.lower()
        assert "cgst" not in teacher_text.lower()
        assert "sgst" not in teacher_text.lower()
        assert "7,080" not in teacher_text

    asyncio.run(_run())

def test_financial_amounts_table_accuracy():
    """Test 4: Verify structured rate extraction on deterministic fee structure document."""
    async def _run():
        fee_doc_id = "doc_test_college_fee_schedule"
        content = (
            "KEMPEGOWDA ACADEMIC FEE SCHEDULE 2026-2027\n"
            "Item 1: Tuition Fee: Rs. 45,000/- per semester\n"
            "Item 2: Laboratory & Equipment Charge: Rs. 12,000/- per semester\n"
            "Item 3: Library & Digital Portal Access: Rs. 3,500/- annually\n"
            "Subtotal: Rs. 60,500/-\n"
            "GST @ 18%: Rs. 10,890/-\n"
            "Total Payable: Rs. 71,390/-"
        )
        retriever.index_document(fee_doc_id, [
            {
                "content": content,
                "document_id": fee_doc_id,
                "page_number": 1,
                "section": "Fee Schedule"
            }
        ])

        res = await teacher_brain.interact(
            doc_id=fee_doc_id,
            student_message="What are the rates and total payable in this document?",
            attached_doc_ids=[fee_doc_id]
        )
        teacher_text = res["teacher_text"]
        assert "Not Found in Uploaded Material" not in teacher_text
        assert "45,000" in teacher_text or "71,390" in teacher_text

    asyncio.run(_run())

def test_document_context_isolation_across_different_materials():
    """Test 5: Cross-document context isolation."""
    async def _run():
        doc_bio = "doc_test_cell_biology"
        doc_math = "doc_test_linear_algebra"

        retriever.index_document(doc_bio, [
            {
                "content": "Mitochondria produce ATP through oxidative phosphorylation inside the eukaryotic cell.",
                "document_id": doc_bio,
                "page_number": 1,
                "section": "Cellular Energetics"
            }
        ])

        retriever.index_document(doc_math, [
            {
                "content": "Eigenvalues are scalars lambda where Ax = lambda x for non-zero eigenvector x.",
                "document_id": doc_math,
                "page_number": 1,
                "section": "Spectral Theory"
            }
        ])

        # Query biology
        res_bio = await teacher_brain.interact(
            doc_id=doc_bio,
            student_message="Explain what mitochondria do in this document."
        )
        assert "mitochondria" in res_bio["teacher_text"].lower()
        assert "eigenvalue" not in res_bio["teacher_text"].lower()

        # Query math
        res_math = await teacher_brain.interact(
            doc_id=doc_math,
            student_message="What is an eigenvalue?"
        )
        assert "eigenvalue" in res_math["teacher_text"].lower()
        assert "mitochondria" not in res_math["teacher_text"].lower()

    asyncio.run(_run())
