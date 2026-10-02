# LEARNOVA
### *Turn Information Into Understanding.*

**LEARNOVA is an Adaptive AI Classroom.**  
Unlike conventional question-answering bots that merely search PDFs and output generic text, LEARNOVA acts as a personal, interactive AI teacher. It ingests documents, constructs relational knowledge representations, orchestrates adaptive pedagogical strategies, diagnoses root misconceptions, presents dynamic visual whiteboards, evaluates comprehension through the Feynman Teach-Back technique, and tracks evidence-grounded learner mastery.

---

## 🌟 Key Innovations & Capabilities

1. **Document Understanding & Knowledge Graph Engine**:
   - Parses multi-page documents (PDF, TXT, Markdown) retaining strict page numbers, section headers, and exact citations.
   - Extracts concepts, categories, and typed relationships (`part_of`, `depends_on`, `example_of`).
   - Interactive, navigable concept graph with real-time mastery badges and concept inspectors.

2. **Adaptive Teacher Brain (Professor Nova)**:
   - **Explain**: Grounded conceptual breakdown based on learner level.
   - **Simplify**: Strips technical jargon using everyday analogies.
   - **Example**: Concrete real-world engineering comparisons.
   - **Analogy**: Intuitive physical models (e.g. Registered Postal Mail vs. Megaphone).
   - **Visual**: Requests dynamic flowcharts, comparison matrices, and timelines on the interactive whiteboard.
   - **Deep Dive**: Rigorous architectural breakdowns (e.g. sliding window flow control).
   - **Socratic**: Interactive thought-experiment prompts.

3. **Misconception Engine (Signature Feature)**:
   - Diagnoses why a student's answer or statement is conceptually flawed rather than merely replying "incorrect."
   - Identifies the root misconception, severity, evidence quote, and generates targeted remediation strategies.
   - *Example*: Diagnoses *"UDP is reliable because it is faster"* → Conflating transmission speed with delivery assurance.

4. **Dynamic Visual Whiteboard**:
   - Renders structured visual payloads (flowcharts, comparison tables, process diagrams, timelines) directly synchronized with teacher explanations.

5. **Animated AI Avatar & Voice Delivery**:
   - High-fidelity vector avatar with real-time lip sync visemes animated according to voice synthesis.
   - Natural eye blinking, facial expressions, and live equalizer audio spectrum analyzer.
   - **Graceful Degradation Ladder**: Built-in browser-native Web Speech STT/TTS ensures 100% functionality with zero crashes even if external cloud keys are omitted.

6. **Feynman Teach-Back Evaluator**:
   - Tests student mastery by challenging them to teach the concept back in their own words.
   - Automatically scores **Understanding Depth (%)**, **Factual Accuracy (%)**, highlights covered vs. missing concepts, and provides actionable pedagogical feedback.

7. **Evidence-Based Learning Analytics & Revision Plan**:
   - Mastery metrics derived directly from student interactions (Mastered, Improving, Needs Review).
   - Generates a structured 3-day personalized revision schedule.

---

## 🚀 Quickstart Guide

### Prerequisites
- Node.js (v18+)
- Python (3.10+)

### 1. Start Backend (FastAPI)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000
```
Backend API will be live at `http://127.0.0.1:8000`.  
Interactive Swagger docs available at `http://127.0.0.1:8000/docs`.

### 2. Start Frontend (Vite + React + TypeScript)
```bash
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```
Open `http://localhost:3000` in your web browser.

### 3. Run Automated System Test Suite
```bash
python3 test_learnova_suite.py
```
Validates all 11 core subsystems end-to-end.

---

## 🎯 4-Minute Competition Demo Script

1. **Open LEARNOVA (`http://localhost:3000`)**:
   - Point out the clean, premium educational interface and brand tagline: *"Turn Information Into Understanding."*
2. **Review Ingested Curriculum in Document Hub**:
   - Navigate to **Document Hub** to see the pre-indexed *Computer Networks & OSI Model* course material with sections, chunks, and citations.
3. **Explore Knowledge Graph**:
   - Switch to **Knowledge Graph**. Click on nodes (*Transport Layer*, *TCP Protocol*, *OSI 7-Layer Model*) to show relational dependencies (`depends_on`, `part_of`) and calculated mastery. Click *"Teach Me This Concept"*.
4. **Enter AI Classroom**:
   - Meet Professor Nova. Listen to the welcome guidance.
   - Click **"💡 Explain simpler"** or type *"What is the transport layer?"* Notice the synchronized mouth viseme speech, grounded citation on Page 4, and the internal courier visual whiteboard.
5. **Demonstrate Misconception Diagnosis (Signature)**:
   - Click the deliberate demo pill: `⚠️ Trigger: "UDP is reliable because it is faster"`.
   - Show how LEARNOVA does NOT just say "wrong":
     - It displays the **Misconception Alert Banner**: *"Equating transmission speed with connection reliability"*.
     - Generates the **Registered Mail vs. Megaphone** comparison matrix on the visual whiteboard.
     - Professor Nova remediates the confusion aloud.
6. **Take Grounded Quiz**:
   - Click **"Take Grounded Quiz"**. Select the correct answer (synchronizing sequence numbers). Submit and view instant verification with celebratory confetti and source grounding.
7. **Execute Feynman Teach-Back Challenge**:
   - Click **"Teach-Back Challenge"**. Click the demo thorough explanation and submit.
   - Showcase the evaluation: **Understanding: 86%**, **Accuracy: 90%**, covered concepts breakdown, and teacher recommendations.
8. **Inspect Learning Analytics & Revision Plan**:
   - Navigate to **Mastery Analytics**.
   - Show the live updated mastery score, progression of concepts to *Mastered*, and the auto-generated **3-Day Revision Plan**.

---

## 📂 Project Structure

```
LEARNOVA/
├── backend/
│   ├── main.py                     # FastAPI REST API endpoints
│   ├── document_processor.py       # Multi-format ingestion, chunking & concept graph
│   ├── embeddings_retriever.py     # Grounded cosine-similarity vector store
│   ├── teacher_brain.py            # Adaptive pedagogical state machine & visual engine
│   ├── misconception_engine.py     # Root-cause diagnostic & remediation engine
│   ├── quiz_engine.py              # Document-grounded quiz generator & evaluator
│   ├── teachback_evaluator.py      # Feynman learning-by-teaching evaluator
│   ├── learner_state.py            # Mastery score tracker & revision scheduler
│   ├── demo_data.py                # High-depth networking curriculum dataset
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AvatarTeacher.tsx   # Animated SVG avatar with audio visemes & speech
│   │   │   ├── VisualWhiteboard.tsx# Dynamic flowcharts, tables, timelines, diagrams
│   │   │   ├── KnowledgeGraphView.tsx # Interactive concept graph canvas & inspector
│   │   │   ├── SourceCitationPanel.tsx# Grounded page citations viewer
│   │   │   ├── QuizModal.tsx       # Grounded assessment modal
│   │   │   ├── TeachBackModal.tsx  # Feynman teach-back studio
│   │   │   ├── OnboardingModal.tsx # Learner preferences modal
│   │   │   └── Navbar.tsx          # Navigation & profile badge
│   │   ├── screens/
│   │   │   ├── LandingScreen.tsx   # Product landing & value proposition
│   │   │   ├── ClassroomScreen.tsx # Hero adaptive AI classroom
│   │   │   ├── KnowledgeGraphScreen.tsx # Fullscreen graph explorer
│   │   │   ├── DocumentHubScreen.tsx# Drag-and-drop ingestion & progress
│   │   │   └── AnalyticsScreen.tsx # Real mastery metrics & revision plan
│   │   ├── api.ts                  # Centralized backend HTTP client
│   │   └── types.ts                # Domain TypeScript models
│   ├── vite.config.ts
│   └── package.json
├── test_learnova_suite.py          # End-to-end integration test runner
├── LEARNOVA_BUILD_PLAN.md          # Engineering execution roadmap
├── ARCHITECTURE.md                 # System architecture & pedagogical loops
├── THIRD_PARTY_NOTICES.md          # Open-source licenses & acknowledgments
└── .env.example                    # Documented configuration variables
```

---

## 🔒 Security & Reliability
- Zero hardcoded API keys. All keys strictly managed via `.env`.
- Graceful degradation ensures zero breaking failures even if external third-party APIs are unconfigured or rate-limited.
- Strict source citations guarantee that every answer links to a verifiable document excerpt and page number.
# LEARNOVA
