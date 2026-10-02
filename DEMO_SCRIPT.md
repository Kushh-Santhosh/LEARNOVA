# LEARNOVA — Official 3-Minute Competition Demo Script

**North Star Problem Statement:**
> *"Design and develop a Python-based AI avatar that can read and understand a provided text document and explain its contents to a learner in a natural, engaging, and conversational manner. The avatar should combine language understanding, speech generation, and visual delivery to create a human-like learning experience."*

---

### **Overview & Roles**
- **Presenter:** Guides the presentation and prompts the system.
- **Professor Nova:** The Python-orchestrated AI Teacher.
- **Live Classroom Interface:** Left quiet sidebar, central conversational workspace, and right contextual Learning Artifact panel.

---

### **Timed Presentation Flow (3:00 Minutes)**

#### **0:00 – 0:20 | Introduction & Grounded Ingestion**
- **Action:** Open LEARNOVA at `http://localhost:3000`. Show the quiet, Claude-inspired workspace.
- **Presenter:** 
  > *"Judges, current AI study tools are either generic chat bots that hallucinate or static PDF summaries with fake percentages. LEARNOVA is different: it is an adaptive AI classroom with a real-time AI teacher, Professor Nova. Everything begins with real document understanding."*
- **Action:** Drag and drop an arbitrary document (e.g. `computer_networks_osi.txt` or `machine_learning_foundations.docx`).
- **Visual:** The ingestion pipeline displays transparent processing phases: *Reading Document → Understanding Structure → Extracting Concepts → Building Knowledge Graph*.

---

#### **0:20 – 0:45 | Dynamic Knowledge Graph & Grounded Provenance**
- **Action:** Navigate to the **Knowledge Graph** tab in the sidebar or right context panel.
- **Presenter:**
  > *"Unlike vector-only search, LEARNOVA extracts a structured concept topology with typed prerequisites and semantic relationships directly from the document. Clicking any concept—like the Transport Layer—reveals verified page numbers, excerpts, and prerequisite dependencies. Notice that every claim has mathematical provenance."*
- **Visual:** Show node relationships: `Application Layer` depends on `Transport Layer (L4)`.

---

#### **0:45 – 1:15 | Meeting Professor Nova: The Conversational Teacher**
- **Action:** Enter the Classroom. Professor Nova appears in the Live Avatar container.
- **Presenter:**
  > *"Notice the architectural distinction: Professor Nova's avatar is the physical delivery layer, but LEARNOVA is the pedagogical brain. Spoken responses are concise (1 to 3 natural sentences) to prevent cognitive overload, while rich structured notes stream simultaneously into the workspace."*
- **Learner Prompts (Voice/Text):**
  > *"Explain how TCP and UDP differ."*
- **Professor Nova Speaks:**
  > *"The Transport Layer ensures end-to-end data delivery between applications. TCP guarantees reliable, ordered packet arrival using handshakes, while UDP streams data quickly without waiting for confirmations."*
- **Visual:** A flowchart appears in the right **Learning Artifact** panel showing packet demultiplexing from IP to application sockets.

---

#### **1:15 – 1:45 | Cross-Lingual Understanding & Indic Code-Switching**
- **Presenter:**
  > *"Education is truly personal only when accessible in the learner's native tongue. Watch what happens when a student asks a question in Kannada against this English textbook."*
- **Learner Prompts (Voice/Text):**
  > *"ಟಿಸಿಪಿ ಮತ್ತು ಯುಡಿಪಿ ವ್ಯತ್ಯಾಸವೇನು? (What is the difference between TCP and UDP?)"*
- **Professor Nova Speaks & Displays (Kannada):**
  > *"ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಲೇಯರ್ (Transport Layer) ಅಪ್ಲಿಕೇಶನ್‌ಗಳ ನಡುವೆ ಎಂಡ್-ಟು-ಎಂಡ್ ಡೇಟಾ ತಲುಪಿಸುವುದನ್ನು ನಿರ್ವಹಿಸುತ್ತದೆ. TCP ಕನೆಕ್ಷನ್-ಓರಿಯೆಂಟೆಡ್ ಆಗಿದ್ದು, ಪ್ಯಾಕೆಟ್‌ಗಳು 100% ತಲುಪುವುದನ್ನು ಖಾತರಿಪಡಿಸುತ್ತದೆ..."*
- **Presenter Highlights:**
  > *"Notice two critical engineering achievements: First, cross-lingual RAG retrieved the English source citations accurately. Second, the technical terminology ('Transport Layer', 'TCP', 'Packets') is preserved in natural code-switching rather than corrupted by literal machine translation."*

---

#### **1:45 – 2:15 | Misconception Detection & Evidence-Driven Remediation**
- **Presenter:**
  > *"Now, the hallmark of a real human teacher: detecting subtle misconceptions."*
- **Learner Prompts:**
  > *"So UDP is reliable because it is faster?"*
- **Professor Nova (Interrupts / Remediates):**
  > *"I see what you're thinking, but speed and reliability are two completely different engineering properties. Let's look at this comparison on the whiteboard."*
- **Visual:**
  - The right panel updates with a high-contrast comparison table:
    - *TCP:* Connection-Oriented | 3-Way Handshake | High Reliability | Variable Latency.
    - *UDP:* Connectionless | Fire-and-Forget | Zero Guarantee | Ultra-low Latency.
- **Professor Nova Verification Check:**
  > *"Which protocol provides retransmissions and acknowledgments?"*
- **Learner Answers:** *"TCP."*
- **Professor Nova:** *"Spot on. That verified your understanding."*

---

#### **2:15 – 2:40 | Grounded Quiz & Feynman Teach-Back**
- **Action:** Switch to `/quiz` or click **Practice Mode**.
- **Presenter:**
  > *"No generic trivia. Quizzes are generated with direct provenance to section paragraphs. Next, our signature feature: the Feynman Teach-Back."*
- **Action:** Click **Teach-Back**. Professor Nova invites:
  > *"Teach the Transport Layer back to me as if I'm your classmate."*
- **Learner Submits Explanation:**
  > *"The transport layer gives ports to processes. TCP does handshakes so no data is lost, and UDP just sends packets fast for gaming."*
- **Evaluation Engine:**
  - Concept Coverage: 85%
  - Factual Accuracy: 92%
  - Feedback: *"Excellent explanation of process ports and reliability trade-offs."*

---

#### **2:40 – 3:00 | Auditable Mastery Ledger & 3-Day Revision Plan**
- **Action:** Navigate to **Progress** & **Revision**.
- **Presenter:**
  > *"Finally, LEARNOVA completely eliminates fake dashboard percentages. Every single mastery score is an auditable cryptographic-style ledger derived from quiz scores, teach-back evaluations, and resolved misconceptions. The 3-day revision plan tells the student exactly what to revisit based on verified forgetting curves.*
  > 
  > *From arbitrary document ingestion to multilingual speech, grounded RAG, and an adaptive human-like teacher—LEARNOVA turns information into genuine understanding. Thank you."*

---

### **Pre-Demo Sanity Checklist**
- [x] Backend running on `http://localhost:8000` (Health 1.2.0 OK)
- [x] Frontend running on `http://localhost:3000` (Vite dev server)
- [x] Test documents verified in `backend/sample_materials/`
- [x] 34/34 Automated tests passing
