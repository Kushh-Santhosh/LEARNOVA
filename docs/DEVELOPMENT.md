# LEARNOVA Development Guide

Welcome to LEARNOVA — the Python-first, competition-ready Adaptive AI Classroom and Universal Learning Companion.

---

## 1. Quickstart

### Prerequisites
- Python 3.11+ (tested on Python 3.12, 3.13, 3.14)
- Node.js 18+ and npm
- OpenRouter API key (Free tier only: `$0.00` prompt / completion cost enforced)

### Backend Setup
```bash
cd backend

# Create & activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI development server
uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be available at `http://127.0.0.1:8000/docs`.

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start Vite development server (runs on port 3000)
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 2. Python-First Architecture

LEARNOVA is structured around clear Python service boundaries:

```
backend/
├── main.py                     # FastAPI application endpoints
├── openrouter_router.py        # Strict zero-cost Free model gateway
├── teacher_brain.py            # Professor Nova pedagogical loop & multimodal teaching
├── quiz_engine.py              # Dynamic grounded quiz generation & evaluation
├── document_processor.py       # PDF/DOCX/TXT/MD extraction & chunking
├── embeddings_retriever.py     # Source grounded semantic & lexical RAG
├── learner_state.py            # Real-time mastery modeling & interaction ledger
├── misconception_engine.py     # Cognitive diagnostic engine & counterexample generation
├── voice_provider.py           # LiveKit Cloud + local Web Speech fallback
├── screen_understanding.py     # DOM element extraction & vision analysis
├── services/
│   ├── learning_path.py        # Dynamic curriculum & roadmap generation
│   └── web_research.py         # Real-time authoritative learning resource research
└── tests/
    └── test_services.py        # Lightweight self-check test suite
```

---

## 3. Strict Free-Only Model Architecture

LEARNOVA strictly enforces a zero-dollar model policy:
- Every candidate model from OpenRouter must have `prompt_price == 0.0` and `completion_price == 0.0`.
- If no cloud model is reachable, the deterministic local pedagogical engine guarantees that teaching, quizzing, and learning paths execute offline without failure.
- No silent fallback to paid APIs (e.g. Gemini paid tiers) is permitted.

---

## 4. Running Tests

Run the backend self-check suite:
```bash
backend/venv/bin/python backend/tests/test_services.py
```

Run frontend build check:
```bash
cd frontend && npm run build
```

---

## 5. Testing the Browser Extension

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select `LEARNOVA/browser-extension`.
4. Open any webpage (e.g., `google.com` or `wikipedia.org`) and click the Professor Nova floating pill.
