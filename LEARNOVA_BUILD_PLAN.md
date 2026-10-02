# LEARNOVA Build Plan
**Adaptive AI Classroom: Turn Information Into Understanding**

## 1. Project Objectives & Core Principles
- **Core Mission**: Build a genuinely working, end-to-end adaptive AI learning platform where a student can upload any study document (PDF, TXT, DOCX) and receive a personal AI teacher that explains, quizzes, detects misconceptions, remediates, tests via teach-back, and tracks mastery.
- **Ponytail Ladder Principles**:
  1. *Does it need to exist?* YAGNI.
  2. *Already in codebase / stdlib / native browser / installed dependency?* Use it first.
  3. *Shortest working diff wins.* Boring over clever. Fewest files possible.
  4. *Reliability & Graceful Degradation*: Full support for Gemini/LLM + Supabase + LiveKit/HeyGen, with zero-crash browser-native Web Speech STT/TTS & local vector/structured extraction fallback when keys are omitted.

---

## 2. System Architecture Overview

```
                      +------------------------------------------+
                      |         LEARNOVA Modern React UI         |
                      |   (Vite + TypeScript + Tailwind + Flow)  |
                      +--------------------+---------------------+
                                           | HTTP / SSE / WebSockets
                                           v
                      +------------------------------------------+
                      |       FastAPI Adaptive Backend Engine    |
                      +--------------------+---------------------+
                                           |
         +-----------------+---------------+-----------------+
         |                 |                                 |
         v                 v                                 v
+-----------------+ +-------------------+             +------------------+
| Document Intel  | |  Teaching Engine  |             |  Storage Layer   |
| - PyMuPDF / Text| | - Lesson Planner  |             | - Supabase / pgvector
| - Structure Ext | | - Socratic Brain  |             |   or SQLite / local
| - Chunker+RAG   | | - Misconception   |             | - Session state  |
| - KG Builder    | | - Quiz / Teachback|             | - Mastery logs   |
+-----------------+ +-------------------+             +------------------+
```

---

## 3. Implementation Phases

### Phase 1: Foundations, Architecture & Documentation
- [x] Workspace inspection and git initialization.
- [x] Configure Ponytail rules & skills (`AGENTS.md`, `.agents/skills`).
- [x] Architectural design docs (`LEARNOVA_BUILD_PLAN.md`, `THIRD_PARTY_NOTICES.md`, `ARCHITECTURE.md`).
- [x] Environment configuration (`.env.example`).

### Phase 2: Document Processing, Extraction & Knowledge Graph (Backend)
- [ ] Multi-format ingestion (PDF via `pymupdf`/`pypdf`, TXT, Markdown, DOCX).
- [ ] Structured extraction: Sections, hierarchy, concepts, relationships, key definitions.
- [ ] Real chunking with source metadata (document_id, page_number, section, source_type, chunk_id).
- [ ] Embedding & vector retrieval engine (Gemini Embeddings with local cosine-similarity vector store fallback).
- [ ] Knowledge graph generator producing nodes and typed relationships (`depends_on`, `part_of`, `example_of`).
- [ ] Real demo document: "Computer Networks & The OSI Model" (sample PDF + text ready for immediate one-click testing).

### Phase 3: The Adaptive AI Teacher Brain (Backend & Orchestration)
- [ ] Teacher Orchestration with explicit teaching modes:
  - `explain`, `simplify`, `deep_dive`, `example`, `analogy`, `quiz_me`, `socratic`, `teach_back`, `remediate`.
- [ ] Real source citation retrieval (never fabricate page numbers or quotations).
- [ ] Visual demonstration payload generator (concept map, flowchart, comparison table, timeline, code/process).
- [ ] Misconception Detection Engine:
  - Classifies student responses (`correct`, `partially_correct`, `incorrect`, `misconception`).
  - Identifies root misconception, evidence, severity, and remediation strategy.
- [ ] Quiz Engine: structured MCQs, True/False, and short-answer questions grounded in document chunks.
- [ ] Teach-Back Evaluator: evaluates student self-explanation against knowledge nodes (coverage, accuracy, missing concepts).
- [ ] Learner Mastery Tracker & Revision Recommender: evidence-based mastery scoring.

### Phase 4: Modern React + Vite Frontend (Aesthetics & Interactivity)
- [ ] Premium Design System:
  - Palette: Deep navy text (`#0f172a`), soft clean background (`#f8fafc`), royal blue accent (`#2563eb`), emerald mastery accents (`#10b981`), amber alert accents (`#f59e0b`).
  - Modern typography, generous whitespace, card hierarchy, micro-interactions.
- [ ] Primary Screens:
  1. **Landing Page**: Compelling hero, "How it works", features breakdown, instant start CTA.
  2. **Learner Onboarding**: Name, education level, style preference (Simple, Examples, Visual, Step-by-step, Exam-focused).
  3. **Document Hub**: Drag-and-drop file upload with live progress stages (Reading -> Extracting -> Mapping -> Ready).
  4. **Interactive Knowledge Graph Screen**: Visual concept map using interactive nodes/edges, detail drawer with concepts, mastery tags, and quick-launch into classroom.
  5. **Hero AI Classroom**:
     - *Left*: Concept tree, active document citation & source viewer.
     - *Center*: Dynamic visual whiteboard / explanation card / quiz module / teach-back recording.
     - *Right*: Animated AI Teacher Avatar with audio visualization, lip sync expressions, voice status.
     - *Bottom*: Voice input button (STT), text prompt, quick-action chips (Explain simpler, Give example, Show visually, Quiz me, Teach back).
  6. **Learning Dashboard & Mastery Analytics**: Mastery meter, weak spots, misconception history, revision plan.

### Phase 5: Voice & Avatar Delivery
- [ ] Voice Interaction: Web Speech API / backend STT + TTS integration.
- [ ] Avatar Presentation Layer:
  - High-fidelity canvas/SVG interactive animated avatar with mouth viseme animation synced to audio frequency/playback, eye-blink, gesture reactions, and mood indicators (explaining, listening, thinking, encouraging).
  - Integration adapter ready for LiveKit / HeyGen when API credentials are provided.

### Phase 6: Verification, Hardening & Competition Polish
- [ ] Comprehensive verification of the end-to-end demo script:
  - Upload sample document -> View KG -> Ask concept question -> Request simpler/analogy -> Trigger deliberate misconception -> View diagnosis & remediation -> Quiz test -> Teach-back session -> Analytics report.
- [ ] Run Ponytail review & audit.
- [ ] Provide runnable scripts and instructions in `README.md`.
