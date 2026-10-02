# LEARNOVA Architecture Specification

**Tagline:** Turn Information Into Understanding  
**System:** Adaptive AI Classroom  

---

## 1. High-Level System Architecture

LEARNOVA decouples **Knowledge Understanding**, **Adaptive Pedagogical Orchestration**, and **Visual/Voice Presentation**.

```
 +-------------------------------------------------------------------------+
 |                          LEARNOVA FRONTEND                              |
 |   +-------------------+  +-----------------------+  +---------------+   |
 |   | Interactive KG    |  | Dynamic Visual Screen |  | Avatar/Voice  |   |
 |   | Concept Inspector |  | Whiteboard / Quizzes  |  | Audio Visemes |   |
 |   +---------+---------+  +-----------+-----------+  +-------+-------+   |
 |             |                        |                      |           |
 +-------------+------------------------+----------------------+-----------+
                                        | HTTP / SSE / REST
                                        v
 +-------------------------------------------------------------------------+
 |                       FASTAPI TEACHING BACKEND                          |
 |                                                                         |
 |  +-------------------------------------------------------------------+  |
 |  |                        TEACHER BRAIN LAYER                        |  |
 |  |  Modes: Explain | Simplify | Analogy | Visual | Quiz | Remediate  |  |
 |  +-------------------+--------------------+---------------------+----+  |
 |                      |                    |                     |       |
 |                      v                    v                     v       |
 |  +-----------------------+  +-------------------+  +-----------------+  |
 |  | Document Intelligence |  | Misconception Eng |  | Teach-Back Eval |  |
 |  | PyMuPDF / Sectioning  |  | Root-cause & Fix  |  | Coverage/Gaps   |  |
 |  +-----------+-----------+  +---------+---------+  +--------+--------+  |
 |              |                        |                     |           |
 +--------------+------------------------+---------------------+-----------+
                |                        |                     |
                v                        v                     v
 +-------------------------------------------------------------------------+
 |                         STORAGE & EMBEDDINGS                            |
 |  - Primary: Supabase PostgreSQL + pgvector                              |
 |  - Local Fallback: Embedded SQLite + High-performance Cosine Store      |
 |  - Knowledge Graph: Relational Node & Edge JSON hierarchy               |
 +-------------------------------------------------------------------------+
```

---

## 2. Core Pedagogical Loop

Instead of standard Chatbot QA (`Query -> Search -> Answer`), LEARNOVA executes an adaptive learning cycle:

```
                  [ Student Question / Response ]
                                 │
                                 ▼
                     [ Comprehension Check ]
                     /                     \
       [ Misconception Detected? ]          [ Valid Understanding ]
              │                                      │
              ▼                                      ▼
      Identify Concept & Root            Reinforce & Deepen Topic
      Select Remediation Strategy        Offer Analogy / Application
      (Analogy / Step-by-Step)                       │
              │                                      ▼
              ▼                              Interactive Quiz
      Present Visual Whiteboard                      │
              │                                      ▼
              └─────────────────────────────► Teach-Back Challenge
                                                     │
                                                     ▼
                                            Log Concept Mastery
```

---

## 3. Data Schemas

### 3.1 Document & Chunks
```json
{
  "document_id": "doc_abc123",
  "title": "Computer Networks: Principles & Protocols",
  "file_type": "pdf",
  "page_count": 12,
  "chunks": [
    {
      "chunk_id": "chk_001",
      "page_number": 2,
      "section": "The OSI Reference Model",
      "content": "The Transport Layer provides transparent transfer of data between end systems...",
      "source_type": "text"
    }
  ]
}
```

### 3.2 Knowledge Graph (Concepts & Relationships)
```json
{
  "concepts": [
    {
      "id": "c_transport_layer",
      "name": "Transport Layer",
      "category": "OSI Layer",
      "summary": "End-to-end communication, reliability, and flow control.",
      "page_number": 2,
      "mastery_score": 0.0
    }
  ],
  "relationships": [
    {
      "source": "c_transport_layer",
      "target": "c_tcp_udp",
      "type": "depends_on" // depends_on | part_of | example_of
    }
  ]
}
```

### 3.3 Misconception Schema
```json
{
  "is_misconception": true,
  "concept": "TCP vs UDP",
  "student_statement": "UDP is reliable because it is faster.",
  "misconception": "Equating transmission speed with connection reliability.",
  "severity": "medium",
  "remediation_strategy": "Separate protocol speed from delivery guarantees using a postal mail analogy."
}
```

### 3.4 Visual Whiteboard Payload
```json
{
  "type": "comparison_table", // flowchart | concept_map | comparison_table | timeline | code_process
  "title": "TCP vs. UDP: Guarantee vs. Speed",
  "data": {
    "headers": ["Feature", "TCP (Transmission Control)", "UDP (User Datagram)"],
    "rows": [
      ["Connection", "Connection-oriented (3-way handshake)", "Connectionless"],
      ["Reliability", "Guaranteed delivery with retransmissions", "Best-effort delivery"],
      ["Header Size", "20-60 bytes", "8 bytes fixed"],
      ["Primary Use", "Web, Email, File Transfer", "Live Streaming, Online Gaming"]
    ]
  },
  "source": { "page": 3, "section": "Transport Layer Protocols" }
}
```

---

## 4. Voice and Avatar Presentation Architecture

- **Audio Viseme Sync**: When the AI teacher speaks, an audio analyzer extracts real-time frequency data, driving synchronized mouth movements, eye blinks, and emotional expressions (Explaining, Listening, Thinking, Celebrating).
- **Graceful Degradation Ladder**:
  1. *Tier 1 (Cloud)*: LiveKit WebRTC / HeyGen streaming if API keys are configured.
  2. *Tier 2 (Browser Native)*: Web Speech API Synthesis + SpeechRecognition + Canvas/SVG Viseme Teacher.
  3. *Tier 3 (Text)*: Instant readable chat with interactive visual whiteboard cards.
- Result: **Zero crashes**. The application is 100% functional regardless of external cloud service status.

---

## 5. Security & Ponytail Compliance
- Zero hardcoded API keys. All credentials reside in `.env`.
- Input file size and MIME-type validation.
- Minimal abstraction layers: Direct FastAPI endpoints, standard Pydantic models, standard React component state.
