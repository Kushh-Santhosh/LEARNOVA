# LEARNOVA Architecture Specification

**System:** LEARNOVA — Adaptive AI Classroom & Cost-Efficient Live Avatar Engine  
**Core Mission:** Turn Information Into Understanding with Sub-₹10/min Live AI Avatar Teaching

---

## 1. System Architecture Overview

LEARNOVA strictly separates the **AI Teacher Brain** from the **Reusable Avatar Engine**, **Presentation UI**, and **Screen Guidance Infrastructure**.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            AI TEACHER BRAIN                                 │
│  - Document Ingestion & Section Preservation (PDF, DOCX, TXT)               │
│  - Grounded RAG Retrieval (Vector + BM25 Cosine)                            │
│  - General Subject Learning Roadmaps & Public Web Research                  │
│  - Misconception Engine & Socratic Pedagogy                                 │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Spoken Text + Pedagogical Context
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       REUSABLE AVATAR ENGINE (Python)                       │
│  ├── VisemeEngine: Deterministic Rhubarb 2D Phoneme-to-Viseme Timelines    │
│  ├── ExpressionEngine: Pedagogical Emotion Curves (8 Expression States)    │
│  ├── Latency Tracker: Checkpoints for Audio Ready & First Avatar Frame      │
│  └── Cost Accounting: Active Speaking Time Accounting vs ≤ ₹10/min SLA      │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ Timed Event Stream (Visemes & Expressions)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       PRESENTATION & RENDERING LAYER                        │
│  ├── Local Nova (Mode A): Client Browser SVG Visor (₹0.00/min Server GPU)   │
│  ├── Cloud Video (Mode B): Optional WebRTC Streaming (HeyGen / GPU)         │
│  └── Text Fallback (Mode C): Instant Subtitle Mode (Zero Lag Resilience)     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Specifications

### 2.1 TeacherBrain (`backend/teacher_brain.py`)
- **Role:** Autonomous teaching intelligence.
- **Modes:** `explain`, `simplify`, `example`, `analogy`, `visual`, `deep_dive`, `socratic`, `exam`, `remediate`.
- **General Learning:** Generates multi-week roadmaps (e.g. "I want to learn Python", "I want to learn C++") with zero fallback to demo documents.
- **Grounding Guard:** Answers are anchored to uploaded document chunks or verified curriculum concepts.

### 2.2 AvatarEngine (`backend/services/avatar_engine.py`)
- **Role:** Central orchestrator for the live avatar pipeline.
- **Input:** `{ text, audio?, emotion?, speaking_style?, language?, mode? }`
- **Output:** `{ audio, duration_ms, viseme_timeline, expression_timeline, start_latency_ms, render_mode, cost_estimate }`
- **Cost Calculation:** Tracks variable costs per active minute ($\text{Target} \le \text{₹}10.00/\text{min}$).

### 2.3 VisemeEngine (`backend/services/viseme_engine.py`)
- **Role:** Deterministic speech-to-mouth mapping without simulated oscillation.
- **Standard:** Rhubarb 2D standard shapes:
  - `A` (Closed: M, B, P), `B` (Teeth: S, T, D, K), `C` (Open: EH, AE), `D` (Wide: AA, AY),
  - `E` (Rounded: AO, ER), `F` (Puckered: UW, OW), `G` (Teeth-on-lip: F, V), `H` (Tongue: L), `X` (Rest).
- **Timing:** Phonetic syllable decomposition calibrated to speech rate (110–185 WPM).

### 2.4 ExpressionEngine (`backend/services/expression_engine.py`)
- **Role:** Dynamic facial expression curve generation.
- **Expressions:** `idle`, `listening`, `thinking`, `explaining`, `encouraging`, `celebrating`, `remediating`, `questioning`.
- **Behavior:** Dynamically sequences multi-stage expressions based on sentence tone and punctuation.

### 2.5 BrowserRenderer (`frontend/src/components/avatar/LocalAvatarProvider.tsx`)
- **Role:** High-performance, client-side vector avatar rendering.
- **Mechanics:** `requestAnimationFrame` loop indexes elapsed time into the viseme and expression timelines to update SVG mouth and eyebrow shapes with zero layout thrashing.

### 2.6 BenchmarkEngine (`backend/services/avatar_benchmark.py`)
- **Role:** Automated testing across 15 standard fixtures (`backend/tests/fixtures/avatar_benchmark.json`).
- **Metrics:** First-frame latency, lip-sync alignment score, expression congruence score, and cost per minute.

### 2.7 EvaluationEngine (`backend/services/evaluation_engine.py`)
- **Role:** 10-dimension pedagogical quality assessment.
- **Dimensions:** Relevance, Accuracy, Completeness, Clarity, Actionability, Personalisation, Structure, Level Appropriateness, Human Likeness, Coherence.
- **Stability:** Repeated trials calculate mean, median, standard deviation, and range.

### 2.8 ScreenUnderstanding & Companions (`backend/screen_understanding.py`)
- **Role:** Multimodal visual guidance (WHAT, WHY, NEXT) with visual pointer coordinates.
- **Browser Extension (`browser-extension/`):** Manifest V3 extension providing non-intrusive DOM inspection and element guidance.
- **Desktop Companion (`desktop/`):** Native Tauri architecture specification for global OS hotkeys and overlay guidance.
