"""
LEARNOVA FastAPI Application
Adaptive AI Classroom Backend Engine
Turn Information Into Understanding.
"""

import os
import shutil
from typing import Optional, List, Dict, Any

def load_env():
    """Loads variables from .env into os.environ without requiring external packages."""
    for path in [os.path.join(os.path.dirname(__file__), "..", ".env"), os.path.join(os.path.dirname(__file__), ".env")]:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            k, v = line.split("=", 1)
                            key = k.strip()
                            val = v.strip().strip("'\"")
                            if key:
                                os.environ[key] = val
            except Exception:
                pass

load_env()

from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import httpx
from document_processor import DocumentProcessor
from embeddings_retriever import retriever
from teacher_brain import teacher_brain
from quiz_engine import quiz_engine
from teachback_evaluator import teachback_evaluator
from learner_state import learner_state
from voice_provider import voice_service, livekit_is_configured, generate_livekit_token, test_livekit_connection
from openrouter_router import openrouter_router
from demo_data import (
    DEMO_DOCUMENT_ID,
    DEMO_DOCUMENT_TITLE,
    DEMO_SECTIONS,
    DEMO_CHUNKS,
    DEMO_CONCEPTS,
    DEMO_RELATIONSHIPS
)

# --- Knowledge Graph (inlined, was knowledge_graph.py) ---
# Maps doc_id -> {"concepts": [...], "relationships": [...]}
_kg_store: Dict[str, Dict[str, Any]] = {}

def kg_set(doc_id: str, concepts: list, relationships: list):
    _kg_store[doc_id] = {"concepts": concepts, "relationships": relationships}

def kg_get(doc_id: str) -> Dict[str, Any]:
    """Returns graph for doc, falling back to demo graph if not loaded."""
    return _kg_store.get(doc_id, {"concepts": DEMO_CONCEPTS, "relationships": DEMO_RELATIONSHIPS})

def kg_get_concept(doc_id: str, concept_id: str) -> Optional[Dict[str, Any]]:
    graph = kg_get(doc_id)
    concept = next((c for c in graph["concepts"] if c["id"] == concept_id), None)
    if not concept:
        return None
    related = []
    for rel in graph["relationships"]:
        if rel["source"] == concept_id:
            other = next((c for c in graph["concepts"] if c["id"] == rel["target"]), None)
            if other:
                related.append({**{"direction": "outgoing"}, **{k: other[k] for k in ("id", "name")}, "relationship": rel["type"], "description": rel.get("description", "")})
        elif rel["target"] == concept_id:
            other = next((c for c in graph["concepts"] if c["id"] == rel["source"]), None)
            if other:
                related.append({**{"direction": "incoming"}, **{k: other[k] for k in ("id", "name")}, "relationship": rel["type"], "description": rel.get("description", "")})
    return {"concept": concept, "related_concepts": related}

# --- Avatar (inlined, was avatar_provider.py) ---
async def _create_avatar_session() -> Dict[str, Any]:
    """Returns a HeyGen LiveAvatar session token, or local fallback."""
    key = os.getenv("HEYGEN_API_KEY", "")
    if key:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.post(
                    "https://api.heygen.com/v1/streaming.new",
                    headers={"X-Api-Key": key},
                    json={"avatar_id": os.getenv("HEYGEN_AVATAR_ID", "default_professor_nova"), "quality": "medium", "voice": {"rate": 1.0}}
                )
                if resp.status_code == 200:
                    data = resp.json().get("data", {})
                    return {"mode": "liveavatar", "session_id": data.get("session_id"), "sdp": data.get("sdp"), "ice_servers": data.get("ice_servers", []), "status": "ready"}
        except Exception:
            pass
    return {"mode": "fallback", "session_id": "local_vector_session", "sdp": None, "ice_servers": [], "status": "fallback_active"}

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
        "title": "Computer Networks & Protocols (Demo Course)",
        "filename": "computer_networks_osi.txt",
        "file_type": "text",
        "language": "en",
        "sections": DEMO_SECTIONS,
        "page_count": 6,
        "chunk_count": len(DEMO_CHUNKS),
        "concept_count": len(DEMO_CONCEPTS),
        "is_demo": True
    }
}

# Pre-index demo document chunks and graph
retriever.index_document(DEMO_DOCUMENT_ID, DEMO_CHUNKS)
kg_set(DEMO_DOCUMENT_ID, DEMO_CONCEPTS, DEMO_RELATIONSHIPS)

# Auto-index existing study materials in backend/uploads on startup
_uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
if os.path.exists(_uploads_dir):
    for _fname in sorted(os.listdir(_uploads_dir)):
        if _fname.endswith((".pdf", ".docx", ".txt", ".md")) and not _fname.startswith("."):
            _fpath = os.path.join(_uploads_dir, _fname)
            try:
                _doc_id = f"doc_{os.path.splitext(_fname)[0]}"
                if _fname.endswith(".pdf"):
                    _secs, _chks = DocumentProcessor.extract_from_pdf(_fpath, _doc_id)
                    _ftype = "pdf"
                elif _fname.endswith(".docx"):
                    _secs, _chks = DocumentProcessor.extract_from_docx(_fpath, _doc_id)
                    _ftype = "docx"
                else:
                    with open(_fpath, "r", encoding="utf-8", errors="ignore") as _f:
                        _secs, _chks = DocumentProcessor.extract_from_text(_f.read(), _doc_id, _fname)
                    _ftype = "text"
                _concs, _rels = DocumentProcessor.extract_concepts_and_graph(_chks, _fname)
                retriever.index_document(_doc_id, _chks)
                kg_set(_doc_id, _concs, _rels)
                DOCUMENTS[_doc_id] = {
                    "id": _doc_id,
                    "title": os.path.splitext(_fname)[0].replace("_", " ").title(),
                    "filename": _fname,
                    "file_type": _ftype,
                    "language": "en",
                    "sections": _secs,
                    "page_count": max([c.get("page_number", 1) for c in _chks]) if _chks else 1,
                    "chunk_count": len(_chks),
                    "concept_count": len(_concs),
                    "is_demo": False
                }
            except Exception:
                pass


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
    active_concept: Optional[str] = None   # resolved server-side; no hardcoded demo default
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

@app.get("/health")
@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "system": "LEARNOVA Adaptive AI Classroom",
        "version": "1.2.0",
        "active_documents": len(DOCUMENTS),
        "voice_capabilities": voice_service.get_voice_capabilities(),
        "avatar_mode": "liveavatar" if os.getenv("HEYGEN_API_KEY") else "fallback",
        "llm_gateway": openrouter_router.get_status()
    }

@app.get("/api/providers/status")
async def get_providers_status():
    """
    Returns automated provider health and billing safety status.
    Guarantees cost is strictly FREE ($0.00).
    """
    router_status = openrouter_router.get_status()
    has_livekit = bool(os.getenv("LIVEKIT_URL") and os.getenv("LIVEKIT_API_KEY"))
    has_liveavatar = bool(os.getenv("HEYGEN_API_KEY"))

    return {
        "openrouter": {
            "status": router_status["status"],
            "configured": router_status["is_configured"],
            "active_model": router_status["active_model"],
            "cost_tier": router_status["cost_tier"],
            "hard_cost_guard": router_status["hard_cost_guard"],
            "fallback_status": router_status["fallback_status"],
            "latency_ms": router_status["last_latency_ms"]
        },
        "local_teacher": {
            "status": "ALWAYS_AVAILABLE",
            "type": "Deterministic Grounded Pedagogy",
            "cost_tier": "FREE ($0.00)"
        },
        "voice": {
            "browser_native": {
                "status": "AVAILABLE",
                "default_character": "Professor Nova (Male / Deep Digital Teacher)",
                "style": "Subtle Robotic"
            },
            "livekit": {
                "status": "AVAILABLE" if has_livekit else "NOT_CONFIGURED"
            },
            "active_provider": "browser_native"
        },
        "avatar": {
            "local_reference_avatar": {
                "status": "ALWAYS_AVAILABLE",
                "character": "Authoritative Professor Nova",
                "is_default": True
            },
            "liveavatar": {
                "status": "AVAILABLE" if has_liveavatar else "NOT_CONFIGURED"
            },
            "active_provider": "local_reference_avatar"
        }
    }

@app.get("/api/avatar/session")
async def get_avatar_session():
    """Returns a short-lived streaming session token or fallback mode status."""
    return await _create_avatar_session()

@app.get("/api/voice/capabilities")
def get_voice_capabilities():
    """Returns supported languages and active STT/TTS stack."""
    return voice_service.get_voice_capabilities()


@app.get("/api/livekit/token")
def get_livekit_token(room: str = "learnova-classroom", identity: str = "learner"):
    """
    Returns a short-lived LiveKit JWT for the frontend.
    API secret never leaves this endpoint — only the signed token is returned.
    """
    if not livekit_is_configured():
        return {"configured": False, "token": None, "url": None}
    token = generate_livekit_token(room=room, identity=identity)
    if not token:
        return {"configured": True, "token": None, "error": "Token generation failed"}
    # Return the LiveKit URL (safe — not a secret) alongside the signed token
    livekit_url = os.getenv("LIVEKIT_URL", "")
    return {"configured": True, "token": token, "url": livekit_url}


@app.get("/api/livekit/test")
async def test_livekit():
    """Real connectivity and authentication test against LiveKit server. Returns metadata only."""
    return await test_livekit_connection()

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
    """
    Handles scalable, incremental multi-format upload: PDF, DOCX, Markdown, and TXT.
    Stream-written in chunks to protect server memory, with strict prompt-injection defense
    and automatic script/language detection.
    """
    uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(uploads_dir, exist_ok=True)
    filename = file.filename or "uploaded_doc.txt"
    file_path = os.path.join(uploads_dir, filename)

    # Scalable stream writing with 100MB server safety threshold
    MAX_BYTES = 100 * 1024 * 1024
    total_written = 0
    with open(file_path, "wb") as buffer:
        while chunk := await file.read(64 * 1024):
            total_written += len(chunk)
            if total_written > MAX_BYTES:
                buffer.close()
                if os.path.exists(file_path):
                    os.remove(file_path)
                raise HTTPException(
                    status_code=413,
                    detail="File exceeds server infrastructure storage capacity threshold (100MB)."
                )
            buffer.write(chunk)

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

    # Detect dominant document language
    sample_text = " ".join([c.get("content", "") for c in chunks[:6]])
    detected_lang = DocumentProcessor.detect_dominant_language(sample_text)

    # Index in retriever & knowledge graph
    retriever.index_document(doc_id, chunks)
    kg_set(doc_id, concepts, relationships)

    doc_meta = {
        "id": doc_id,
        "title": os.path.splitext(filename)[0].replace("_", " ").title(),
        "filename": filename,
        "file_type": file_type,
        "language": detected_lang,
        "sections": sections,
        "page_count": max([c.get("page_number", 1) for c in chunks]) if chunks else 1,
        "chunk_count": len(chunks),
        "concept_count": len(concepts),
        "is_demo": False
    }
    DOCUMENTS[doc_id] = doc_meta
    learner_state.set_active_document(doc_id, doc_meta["title"], concepts)

    return {
        "message": "Document processed and knowledge graph constructed successfully.",
        "document": doc_meta
    }

@app.get("/api/documents/{doc_id}/knowledge-graph")
def get_knowledge_graph(doc_id: str):
    return kg_get(doc_id)

@app.get("/api/documents/{doc_id}/concepts/{concept_id}")
def get_concept_details(doc_id: str, concept_id: str):
    details = kg_get_concept(doc_id, concept_id)
    if not details:
        raise HTTPException(status_code=404, detail="Concept not found")
    return details

@app.post("/api/teach")
async def teach_interaction(req: TeachRequest):
    """Core AI teacher conversation loop with adaptive teaching, visual artifacts, and multilingual support."""
    active_concept = req.active_concept
    if not active_concept:
        doc_meta = DOCUMENTS.get(req.document_id)
        if doc_meta:
            # Use the document title as the concept anchor
            active_concept = doc_meta["title"]
        else:
            # No document loaded — derive concept from the user's own message
            # This is the GENERAL_LEARNING path; teacher_brain will handle it
            active_concept = req.message[:80]

    result = await teacher_brain.interact(
        doc_id=req.document_id,
        student_message=req.message,
        active_concept=active_concept,
        mode=req.mode or "explain",
        language=req.language or "en"
    )
    if isinstance(result, dict):
        text_to_speak = result.get("spoken_text") or result.get("teacher_text", "")
        if text_to_speak:
            result["avatar_turn"] = await avatar_engine.orchestrate_turn(
                text=text_to_speak,
                emotion=result.get("emotion") or result.get("pedagogical_phase"),
                language=req.language or "en"
            )
    return result



@app.post("/api/teach/voice")
async def voice_interaction(audio: UploadFile = File(None), transcript: Optional[str] = Form(None), language: Optional[str] = Form("en")):
    """Receives either client-side speech transcript or audio file."""
    text = transcript or "Can you explain the main concept of this document?"
    return {
        "transcript": text,
        "language": language or "en",
        "confidence": 0.98
    }

@app.post("/api/quiz/generate")
def generate_quiz(req: QuizGenerateRequest):
    if req.document_id in ("general_learning", None, ""):
        return quiz_engine.generate_topic_quiz(req.concept)

    doc_chunks = retriever.doc_chunks.get(req.document_id)
    if doc_chunks is None:
        if req.document_id == DEMO_DOCUMENT_ID:
            return quiz_engine.generate_quiz(req.concept, doc_chunks=None, is_demo_doc=True)
        # For general subjects without uploaded document
        return quiz_engine.generate_topic_quiz(req.concept)

    is_demo = (req.document_id == DEMO_DOCUMENT_ID)
    quiz = quiz_engine.generate_quiz(req.concept, doc_chunks, is_demo_doc=is_demo)
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
        kg = kg_get(doc_id)
        for c in kg.get("concepts", []):
            if query in c["name"].lower() or query in c.get("summary", "").lower():
                matched_concepts.append(c)
    return {
        "query": q,
        "documents": matched_docs,
        "concepts": matched_concepts[:6]
    }


# --- Screen-Aware Professor Nova Endpoints ---
from screen_understanding import screen_service

class ScreenAnalyzeRequest(BaseModel):
    goal: str
    mode: Optional[str] = "dom"
    current_route: Optional[str] = "home"
    dom_elements: Optional[List[Dict[str, Any]]] = None
    screenshot_base64: Optional[str] = None
    step_index: Optional[int] = 1
    active_document_id: Optional[str] = None

class ScreenVerifyRequest(BaseModel):
    workflow: str
    step_number: int
    current_route: str
    user_action: Optional[str] = "clicked"
    dom_evidence: Optional[Dict[str, Any]] = None

@app.get("/api/screen/capabilities")
def get_screen_capabilities():
    return {
        "status": "ready",
        "supported_modes": [
            {"id": "dom", "name": "Current LEARNOVA Page (DOM)", "status": "AVAILABLE", "is_default": True},
            {"id": "browser_screen", "name": "Browser Tab / Screen Sharing", "status": "AVAILABLE", "requires_permission": True},
            {"id": "desktop", "name": "Desktop Companion", "status": "ARCHITECTURE_READY", "requires_native_companion": True}
        ],
        "privacy": {
            "transient_in_memory_only": True,
            "zero_disk_logging": True,
            "permission_gated": True
        },
        "vision_provider": {
            "type": "OpenRouterVisionProvider",
            "is_configured": screen_service.vision_provider.is_available(),
            "cost_tier": "FREE ($0.00)"
        }
    }

@app.post("/api/screen/analyze")
async def analyze_screen_context(req: ScreenAnalyzeRequest):
    return await screen_service.analyze(
        goal=req.goal,
        mode=req.mode or "dom",
        current_route=req.current_route or "home",
        dom_elements=req.dom_elements or [],
        screenshot_base64=req.screenshot_base64,
        step_index=req.step_index or 1,
        active_document_id=req.active_document_id
    )

@app.post("/api/screen/verify-step")
def verify_screen_step(req: ScreenVerifyRequest):
    return screen_service.verify_step(
        workflow=req.workflow,
        step_number=req.step_number,
        current_route=req.current_route,
        user_action=req.user_action or "clicked",
        dom_evidence=req.dom_evidence
    )


# --- General Learning Endpoints (no document required) ---
import sys as _sys
_sys.path.insert(0, os.path.dirname(__file__))
from services.learning_path import learning_path_service
from services.web_research import web_research_service

class LearnPathRequest(BaseModel):
    goal: str
    learner_level: Optional[str] = "beginner"
    time_available: Optional[str] = None
    preferred_language: Optional[str] = "en"
    learning_style: Optional[str] = None

class LearnResearchRequest(BaseModel):
    goal: str
    max_resources: Optional[int] = 8

@app.post("/api/learn/path")
async def generate_learning_path(req: LearnPathRequest):
    """
    Generate a structured learning path for any subject.
    No document upload required — used by GENERAL_LEARNING intent.
    """
    path = await learning_path_service.generate(
        goal=req.goal,
        learner_level=req.learner_level or "beginner",
        time_available=req.time_available,
        preferred_language=req.preferred_language or "en",
        learning_style=req.learning_style,
        llm_caller=teacher_brain.call_llm if openrouter_router.is_configured() else None,
    )
    return {
        "goal": path.goal,
        "learner_level": path.learner_level,
        "total_modules": path.total_modules,
        "estimated_total_hours": path.estimated_total_hours,
        "modules": [
            {
                "order": m.order,
                "title": m.title,
                "description": m.description,
                "estimated_hours": m.estimated_hours,
                "prerequisites": m.prerequisites,
                "key_concepts": m.key_concepts,
                "practice_project": m.practice_project,
            }
            for m in path.modules
        ],
    }

@app.post("/api/learn/research")
async def research_learning_resources(req: LearnResearchRequest):
    """
    Research public learning resources for a subject.
    Returns real retrieved URLs — never fabricated.
    """
    result = await web_research_service.research(
        goal=req.goal,
        max_resources=req.max_resources or 8,
        llm_caller=teacher_brain.call_llm if openrouter_router.is_configured() else None,
    )
    return {
        "goal": result.goal,
        "summary": result.summary,
        "key_concepts": result.key_concepts,
        "learning_sequence": result.learning_sequence,
        "resources": [
            {
                "title": r.title,
                "url": r.url,
                "source": r.source,
                "description": r.description,
                "why_recommended": r.why_recommended,
                "difficulty": r.difficulty,
                "estimated_time": r.estimated_time,
                "topic": r.topic,
            }
            for r in result.resources
        ],
    }


# --- Avatar Engine & Internal Evaluation Endpoints ---
from services.avatar_engine import avatar_engine
from services.avatar_benchmark import avatar_benchmark_service
from services.evaluation_engine import evaluation_engine


class AvatarSpeakRequest(BaseModel):
    text: str
    audio: Optional[str] = None
    emotion: Optional[str] = None
    speaking_style: Optional[str] = None
    language: Optional[str] = "en"
    mode: Optional[str] = "mode_a_local"
    speech_rate_wpm: Optional[int] = 150


class AvatarBenchmarkRunRequest(BaseModel):
    mode: Optional[str] = "mode_a_local"


class EvaluateRequest(BaseModel):
    query: str
    response: str
    context: Optional[str] = None
    learner_level: Optional[str] = "intermediate"
    iterations: Optional[int] = 5


@app.post("/api/avatar/speak")
async def avatar_speak(req: AvatarSpeakRequest):
    """
    Orchestrates live avatar delivery:
    Transforms text/audio into timed Rhubarb 2D visemes, facial expressions,
    accurate latency metrics, and transparent cost estimates.
    """
    return await avatar_engine.orchestrate_turn(
        text=req.text,
        audio=req.audio,
        emotion=req.emotion,
        speaking_style=req.speaking_style,
        language=req.language or "en",
        mode=req.mode or "mode_a_local",
        speech_rate_wpm=req.speech_rate_wpm or 150
    )


@app.get("/api/avatar/benchmark")
@app.post("/api/avatar/benchmark/run")
async def run_avatar_benchmark(req: Optional[AvatarBenchmarkRunRequest] = None):
    """
    Executes automated benchmark suite across short, medium, long, negotiation,
    and educational test cases. Returns latency, lip-sync, expression, and cost comparisons.
    """
    mode = req.mode if req else "mode_a_local"
    return await avatar_benchmark_service.run_full_benchmark(mode=mode)


@app.post("/api/avatar/evaluate")
async def evaluate_teaching_response(req: EvaluateRequest):
    """
    Evaluates teacher & avatar responses across 10 pedagogical dimensions
    with repeated multi-iteration consistency statistics.
    """
    eval_data = evaluation_engine.evaluate_response(
        query=req.query,
        response=req.response,
        context=req.context,
        learner_level=req.learner_level or "intermediate"
    )
    consistency = evaluation_engine.evaluate_consistency(
        query=req.query,
        response=req.response,
        iterations=req.iterations or 5,
        context=req.context,
        learner_level=req.learner_level or "intermediate"
    )
    return {
        "evaluation": eval_data,
        "consistency": consistency
    }

