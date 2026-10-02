# LEARNOVA — Real Student UX Test Script

**Scenario:** "I am a college student and I just uploaded my study notes."

---

## 1. The 10-Second Test: Immediate Value Comprehension
* **Question:** What does this application do?
* **Observer Experience:**
  - The student lands on the workspace.
  - The header communicates: "LEARNOVA • AI Classroom".
  - The prominent card presents: "Active Lesson • Continue lesson" with current topic and course title.
  - A student immediately understands: *"This is my personalized AI study space. I can upload my lecture notes and study with an adaptive teacher who knows my materials."*
* **Outcome:** **PASSED (Immediate clarity within 4 seconds)**.

---

## 2. The 30-Second Test: Navigation & Tool Discovery
* **Question:** Where do my documents live? Where is the teacher? How do I ask a question?
* **Observer Experience:**
  - The left sidebar is minimal: `Home`, `Learn`, `Knowledge`, `Documents`, `Progress`.
  - Clicking `Learn` immediately opens the conversational lesson with Professor Nova.
  - The bottom composer has a clear placeholder: "Ask Professor Nova anything..." with mode buttons: `Explain`, `Socratic`, `Simplify`, `Quiz`, `Visual`.
  - The teacher avatar is visible on the right with a status indicator ("Ready to Teach") and speech synthesis controls.
* **Outcome:** **PASSED (No hunting through complex submenus)**.

---

## 3. The 3-Minute Demo Walkthrough

| Time | Action | What the Student Sees & Experiences | Friction Check |
|---|---|---|---|
| **0:00** | Drag-and-drop notes PDF/TXT into Documents Hub | Clean dashed dropzone highlights; file is accepted immediately. | Zero friction |
| **0:15** | Progressive document analysis | Animated stage banner shows reading -> structure -> concepts -> graph -> teacher ready. | High trust; transparent processing |
| **0:30** | Explore Knowledge Graph | Interactive SVG graph opens; nodes show full concept names with mastery colors. | No cryptic codes |
| **0:45** | Meet Professor Nova | Friendly, authoritative AI character greets the student with audio summary and initial diagnostic question. | Delightful and professional |
| **1:00** | Ask core concept question | Student asks "How does TCP guarantee reliability?" in the composer. | Instant response with citations |
| **1:20** | Switch to Socratic mode | Nova guides the student by asking about packet timeouts and acknowledgements. | Interactive inquiry |
| **1:35** | Visual Artifact Generation | Professor Nova creates a side-by-side comparison table and timeline. Student clicks "View in Workspace" to inspect. | Seamless side-by-side workspace |
| **1:50** | Ask for a simpler explanation | Nova provides the intuitive Registered Mail vs Megaphone analogy. | Immediate cognitive grounding |
| **2:05** | Trigger Misconception | Student types "UDP is more reliable because it is faster". Nova diagnoses the misconception, displays a targeted remediation card with counterexample, and asks a verification check. | Rigorous learning |
| **2:35** | Diagnostic Quiz | Student clicks "Quiz" in header; answers a grounded multiple-choice question; receives immediate feedback and confetti. | Engaging self-test |
| **2:50** | Feynman Teach-Back | Student clicks "Teach-Back"; explains concept in own words; Nova evaluates depth, accuracy, and missing concepts. | Deep retention verified |
| **3:00** | Check Progress & Revision | Student opens "Progress" to see what needs attention, what's improving, and a spaced repetition schedule. | Clear next steps |
