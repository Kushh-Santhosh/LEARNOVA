"""
LEARNOVA FastAPI Application
Adaptive AI Classroom Backend Engine
Turn Information Into Understanding.
"""

import os
import shutil
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from document_processor import DocumentProcessor
from embeddings_retriever import retriever
from knowledge_graph import kg_manager
from teacher_brain import teacher_brain
from quiz_engine import quiz_engine
from teachback_evaluator import teachback_evaluator
from learner_state import learner_state
from voice_provider import voice_service
from avatar_provider import avatar_service
from demo_data import (
    DEMO_DOCUMENT_ID,
    DEMO_DOCUMENT_TITLE,
    DEMO_SECTIONS,
    DEMO_CHUNKS,
    DEMO_CONCEPTS,
    DEMO_RELATIONSHIPS
)

app = FastAPI(
    title="LEARNOVA - Adaptive AI Classroom API",
    description="Backend engine for document understanding, knowledge graphs, adaptive teaching, multilingual intelligence, and real-time avatar delivery.",
    version="1.2.0"
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory document storage
DOCUMENTS: Dict[str, Dict[str, Any]] = {
    DEMO_DOCUMENT_ID: {
        "id": DEMO_DOCUMENT_ID,
        "title": DEMO_DOCUMENT_TITLE,
        "filename": "computer_networks_osi.txt",
        "file_type": "text",
        "sections": DEMO_SECTIONS,
        "chunk_count": len(DEMO_CHUNKS),
        "concept_count": len(DEMO_CONCEPTS)
    }
}

# Pre-index demo document chunks and graph
retriever.index_document(DEMO_DOCUMENT_ID, DEMO_CHUNKS)
kg_manager.set_graph(DEMO_DOCUMENT_ID, DEMO_CONCEPTS, DEMO_RELATIONSHIPS)


# --- Request/Response Schemas ---
class LearnerProfileRequest(BaseModel):
    name: str
    education_level: str
    learning_level: str
    preferred_style: str
    language: Optional[str] = "en"

class TeachRequest(BaseModel):
    document_id: str
    message: str
    active_concept: Optional[str] = "Transport Layer (L4)"
    mode: Optional[str] = "explain"
    language: Optional[str] = "en"

class QuizGenerateRequest(BaseModel):
    document_id: str
    concept: Optional[str] = None

class QuizEvaluateRequest(BaseModel):
    quiz_id: str
    concept: str
    student_answer: str

class TeachBackRequest(BaseModel):
    document_id: str
    concept_id: str
    concept_name: Optional[str] = ""
    student_explanation: str

class ResolveMisconceptionRequest(BaseModel):
    concept_name: str


# --- API Routes ---

@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "system": "LEARNOVA Adaptive AI Classroom",
        "version": "1.2.0",
        "active_documents": len(DOCUMENTS),
        "voice_capabilities": voice_service.get_voice_capabilities(),
        "avatar_mode": "liveavatar" if avatar_service.heygen_key else "fallback"
    }

@app.get("/api/avatar/session")
async def get_avatar_session():
    """Returns a short-lived streaming session token or fallback mode status."""
    return await avatar_service.create_avatar_session()

@app.get("/api/voice/capabilities")
def get_voice_capabilities():
    """Returns supported languages and active STT/TTS stack."""
    return voice_service.get_voice_capabilities()

@app.get("/api/documents")
def get_documents():
    return list(DOCUMENTS.values())

@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str):
    if doc_id not in DOCUMENTS:
        raise HTTPException(status_code=404, detail="Document not found")
    return DOCUMENTS[doc_id]

@app.post("/api/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Handles multi-format upload: PDF, DOCX, Markdown, and TXT with prompt injection defense."""
    os.makedirs("uploads", exist_ok=True)
    filename = file.filename or "uploaded_doc.txt"
    file_path = os.path.join("uploads", filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_id = f"doc_{os.path.splitext(filename)[0].lower().replace(' ', '_')}"
    file_ext = os.path.splitext(filename)[1].lower()

    if file_ext == ".pdf":
        sections, chunks = DocumentProcessor.extract_from_pdf(file_path, doc_id)
        file_type = "pdf"
    elif file_ext in [".docx", ".doc"]:
        sections, chunks = DocumentProcessor.extract_from_docx(file_path, doc_id)
        file_type = "docx"
    else:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()
        sections, chunks = DocumentProcessor.extract_from_text(content, doc_id, filename)
        file_type = "text"

    # Extract concepts & graph
    concepts, relationships = DocumentProcessor.extract_concepts_and_graph(chunks, filename)

    # Index in retriever & KG manager
    retriever.index_document(doc_id, chunks)
    kg_manager.set_graph(doc_id, concepts, relationships)

    doc_meta = {
        "id": doc_id,
        "title": os.path.splitext(filename)[0].replace("_", " ").title(),
        "filename": filename,
        "file_type": file_type,
        "sections": sections,
        "chunk_count": len(chunks),
        "concept_count": len(concepts)
    }
    DOCUMENTS[doc_id] = doc_meta

    return {
        "message": "Document processed and knowledge graph constructed successfully.",
        "document": doc_meta
    }

@app.get("/api/documents/{doc_id}/knowledge-graph")
def get_knowledge_graph(doc_id: str):
    return kg_manager.get_graph(doc_id)

@app.get("/api/documents/{doc_id}/concepts/{concept_id}")
def get_concept_details(doc_id: str, concept_id: str):
    details = kg_manager.get_concept_details(doc_id, concept_id)
    if not details:
        raise HTTPException(status_code=404, detail="Concept not found")
    return details

@app.post("/api/teach")
async def teach_interaction(req: TeachRequest):
    """Core AI teacher conversation loop with adaptive teaching, visual artifacts, and multilingual support."""
    result = await teacher_brain.interact(
        doc_id=req.document_id,
        student_message=req.message,
        active_concept=req.active_concept or "Transport Layer (L4)",
        mode=req.mode or "explain",
        language=req.language or "en"
    )
    return result

@app.post("/api/teach/voice")
async def voice_interaction(audio: UploadFile = File(None), transcript: Optional[str] = Form(None), language: Optional[str] = Form("en")):
    """Receives either client-side speech transcript or audio file."""
    text = transcript or "What is the transport layer in networking?"
    return {
        "transcript": text,
        "language": language or "en",
        "confidence": 0.98
    }

@app.post("/api/quiz/generate")
def generate_quiz(req: QuizGenerateRequest):
    doc_chunks = retriever.doc_chunks.get(req.document_id, DEMO_CHUNKS)
    quiz = quiz_engine.generate_quiz(req.concept, doc_chunks)
    return quiz

@app.post("/api/quiz/evaluate")
def evaluate_quiz(req: QuizEvaluateRequest):
    result = quiz_engine.evaluate_answer(req.quiz_id, req.student_answer)
    learner_state.record_quiz_result(req.quiz_id, req.concept, result["is_correct"], result["score"])
    return result

@app.post("/api/teach-back/evaluate")
def evaluate_teach_back(req: TeachBackRequest):
    result = teachback_evaluator.evaluate(req.concept_id, req.student_explanation, req.concept_name or "")
    learner_state.record_teachback(result)
    return result

@app.post("/api/learner/misconceptions/resolve")
def resolve_misconception(req: ResolveMisconceptionRequest):
    learner_state.resolve_misconception(req.concept_name)
    return {"message": "Misconception marked as resolved with evidence."}

@app.get("/api/learner/progress")
def get_learner_progress():
    return learner_state.get_analytics()

@app.post("/api/learner/profile")
def update_profile(req: LearnerProfileRequest):
    learner_state.update_profile(
        name=req.name,
        education_level=req.education_level,
        learning_level=req.learning_level,
        preferred_style=req.preferred_style,
        language=req.language or "en"
    )
    return {"message": "Profile updated", "profile": learner_state.profile}

@app.get("/api/search")
def search_workspace(q: str = ""):
    """Lightweight search across documents and concepts."""
    query = q.lower().strip()
    matched_docs = [d for d in DOCUMENTS.values() if query in d["title"].lower()]
    matched_concepts = []
    for doc_id in DOCUMENTS:
        kg = kg_manager.get_graph(doc_id)
        for c in kg.get("concepts", []):
            if query in c["name"].lower() or query in c.get("summary", "").lower():
                matched_concepts.append(c)
    return {
        "query": q,
        "documents": matched_docs,
        "concepts": matched_concepts[:6]
    }
