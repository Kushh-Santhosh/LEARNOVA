# LEARNOVA — Comprehensive UI/UX Product Audit

**Date:** October 2, 2026  
**Auditor:** Senior Product & AI UX Architect (Pair Programming with User)  
**System Tested:** Live application running on `http://127.0.0.1:3000` (Next/Vite frontend + FastAPI backend)  
**Method:** Real headless browser rendering with Playwright, full-resolution screen capture, DOM inspection, and responsive stress testing (Desktop 1440px, Tablet 768px, Mobile 375px).

---

## Executive Summary

The current LEARNOVA platform has an exceptionally powerful and complete backend architecture (strict RAG, knowledge graphs, misconception diagnosis, Feynman teach-back evaluator, multilingual models). However, the visual and interaction layer suffers from **"AI Education Dashboard Syndrome"**:
1. It feels like an administrative corporate dashboard or a hackathon prototype rather than a calm, focused, premium educational workspace (the standard set by Claude and modern educational environments).
2. The Professor Nova teacher avatar is rendered as a generic cartoon illustration (blue circle, glasses, suit, cartoon face) rather than a futuristic, intelligent, calm digital AI presence.
3. The Information Architecture is scattered across 5 disconnected top-level sidebar items ("Current Lesson", "Knowledge Graph", "Study Documents", "Mastery & Progress", "Revision Plan") with heavy redundancy between Progress and Revision.
4. Mobile and tablet viewports are severely broken, with the 256px dark sidebar taking up 70% of screen width on 375px devices, compressing conversation into an unreadable vertical column.
5. The conversation experience is card-heavy, cluttered with demo buttons ("⚠️ Test Misconception Trigger"), and lacks contextual progressive disclosure.

Below is the detailed, per-screen audit with concrete root causes and prioritized solutions.

---

## Screen-by-Screen Audit

### 1. Global Navigation & Sidebar
* **Problem:**
  - The sidebar is wide (~256px), permanently dark (`bg-slate-900`), and loaded with admin-style navigation links: *Current Lesson*, *Knowledge Graph*, *Study Documents*, *Mastery & Progress*, *Revision Plan*.
  - A prominent card "ACTIVE COURSE: Computer Networks" sits permanently in the sidebar.
  - "Mastery & Progress" and "Revision Plan" are separate destinations even though they present virtually the same data.
  - On mobile viewports (<768px), the sidebar does not collapse into a drawer or sheet; it stays open, destroying the layout.
* **Why it feels wrong:**
  - Feels like a generic SaaS analytics dashboard (Datadog/Mixpanel) rather than an intellectual learning space.
  - Steals ~20% of horizontal real estate on desktop, and completely ruins mobile screens.
* **Proposed Solution:**
  - Redesign Information Architecture into a clean, minimalist structure:
    - **Global:** `Home`, `Courses`, `Documents`, `Progress`
    - **Bottom:** Profile / Learning Preferences
  - Reduce sidebar width to ~220px on desktop with clean, muted typography and soft neutrals (`bg-white` or ultra-soft charcoal/slate-50 border).
  - Fold "Revision Plan" into `Progress` as a focused tab/section.
  - Turn the sidebar into an overlay drawer on mobile/tablet viewports (<1024px) with a subtle hamburger trigger.
* **Priority:** **P0 (Critical Architecture)**

---

### 2. Classroom Workspace ("Current Lesson")
* **Problem:**
  - Named "Current Lesson" in the sidebar, which feels like a static status page rather than an active learning session.
  - Top header has scattered buttons: "Quiz Me", "Teach-Back", active concept label, and breadcrumbs.
  - The right column is permanently open at 320px (`w-80`), featuring:
    1. A giant cartoon teacher avatar card.
    2. A "Curriculum Outline" percentage list.
    3. A bright yellow "COMPETITION DEMONSTRATION: Test Misconception Trigger" button.
  - Every message is enclosed in heavy rounded cards (`rounded-3xl border border-slate-200 shadow-2xs`).
  - Citations and artifacts compete with the conversation instead of opening contextually.
* **Why it feels wrong:**
  - Visual noise overwhelms the actual pedagogy. Instead of a calm, focused dialogue between student and AI teacher, the user is surrounded by badges, outlines, and demo warnings.
  - Lacks the serene whitespace and progressive disclosure of Claude or ChatGPT.
* **Proposed Solution:**
  - Rename conceptual experience to **Lesson** or **Learn**.
  - Simplify header: Breadcrumbs (`Courses / Computer Networks / Transport Layer`), lesson status, quiet teacher indicator, and contextual action triggers.
  - Right panel must be **strictly contextual**:
    - Default state: Center conversation takes the stage with a compact, elegant floating or docked Professor Nova presence (20–25% visual weight).
    - When an Artifact (flowchart, comparison table) or Source Citation is clicked: Open a sleek side-by-side workspace panel (or bottom sheet on mobile).
    - Provide a "Focus Teacher" mode that expands Professor Nova into an immersive live tutoring view with prominent captions and audio wave visualizer.
  - Remove all artificial demo widgets ("Competition Demonstration") from production UI.
* **Priority:** **P0 (Core Experience)**

---

### 3. Professor Nova Teacher Avatar
* **Problem:**
  - Current visual is an SVG cartoon with a blue circular badge, yellow skin, cartoon hair, blue glasses, and a business suit with a tie.
  - It looks like a clip-art mascot from a 2012 educational game.
  - Does not reflect state transitions smoothly (listening, thinking, speaking, interrupted, connecting, error).
  - No provider abstraction: the cartoon SVG is hardcoded directly into the component.
* **Why it feels wrong:**
  - Destroys the credibility of an "Advanced Adaptive AI Teacher". An adult or college student finds it childish and toy-like.
* **Proposed Solution:**
  - Completely redesign Professor Nova as an **Advanced Digital AI Teacher**:
    - Minimalist, futuristic, intelligent, elegant, subtle holographic/digital presence with human-centered aesthetics.
    - Original LEARNOVA identity: glowing neural core / digital holographic visage with realistic micro-animations, breathing ambient motion, intelligent gaze, subtle audio waveform aura, and expressive eye/mouth state transitions.
  - Provider Abstraction:
    - Create `AvatarProvider` interface with `LocalAvatarProvider` and `LiveAvatarProvider` (future HeyGen LiveAvatar compatibility).
    - Maintain identical dimensions, state machine (`IDLE`, `LISTENING`, `THINKING`, `SPEAKING`, `INTERRUPTED`, `CONNECTING`, `ERROR`), captioning system, and audio controls across both providers.
  - Include responsive states and expandable "Focus Teacher" mode.
* **Priority:** **P0 (Brand & Product Identity)**

---

### 4. Chat Composer Bar
* **Problem:**
  - The composer looks like a generic input field with separate bottom pills (`Explain`, `Simplify`, `Socratic`, `Exam`, `EN`, `Cmd`).
  - On mobile, pills wrap awkwardly, and the input box consumes vertical space without feeling like a grounded, modern composer.
  - Audio microphone button is small and lacks immediate audio activity feedback.
* **Why it feels wrong:**
  - It looks like a search bar from an early 2020s web forum rather than the tactile, intelligent composer found in ChatGPT or Claude.
* **Proposed Solution:**
  - Redesign into a sleek, floating multi-line composer with:
    - Subtle auto-expanding textarea with calm placeholder ("Ask Professor Nova anything about this lesson...").
    - Left action: Quick mode toggle (Explain, Socratic, Simplify, Practice) and attachment/command trigger.
    - Right action: High-tactile microphone button with active wave/pulse state + send button.
    - Restrained, elegant keyboard shortcuts (`Enter` to send, `Shift+Enter` for newline).
* **Priority:** **P0 (Daily Interaction Anchor)**

---

### 5. Knowledge Graph Screen
* **Problem:**
  - Nodes use cryptic 3-letter abbreviations: `ARC`, `MEC`, `FOU`, `TRA`.
  - Top header has 3 large stat boxes: "7 Concepts", "3 Major Topics", "7 Relationships".
  - Canvas layout feels disjointed from the active course and lesson.
  - Inspecting a concept opens a heavy side card rather than a fluid, contextual concept detail sheet.
* **Why it feels wrong:**
  - Cryptic abbreviations make the graph harder to read than a simple list, contradicting the graph's purpose.
  - Feels like a backend debugging view rather than an intuitive map of knowledge.
* **Proposed Solution:**
  - Render clear, human-readable concept names on nodes (e.g., "Transport Layer", "Packet Switching", "TCP Protocol").
  - Use calm, differentiated styling for mastery states (Unseen, In Progress, Mastered).
  - Connect concept clicks directly to actions: "Teach Me This", "Quiz Me", "Review Prerequisites".
  - Integrate Knowledge Graph as a first-class tab inside the Course Workspace (`Learn`, `Materials`, `Knowledge`, `Progress`).
* **Priority:** **P1 (High)**

---

### 6. Study Documents Hub
* **Problem:**
  - Dashed-line dropzone with bright blue text.
  - Cards show repetitive metadata: "7 Concepts • 5 Citations", "12 Concepts • 11 Citations".
  - Processing state shows a generic spinner and simulated progress bar without real pedagogical storytelling.
* **Why it feels wrong:**
  - Feels like an admin file management table rather than an intellectual library of study materials.
* **Proposed Solution:**
  - Calm, spacious document repository with search and filter.
  - Quiet, clean metadata: e.g., "PDF · 24 pages · Added today · 12 concepts mapped".
  - Intelligent progressive disclosure during processing:
    1. *Reading your document*
    2. *Understanding sections & taxonomy*
    3. *Identifying core concepts & relationships*
    4. *Structuring your adaptive curriculum*
    5. *Ready to learn*
  - Direct 1-click transition to Course Workspace.
* **Priority:** **P1 (High)**

---

### 7. Mastery, Progress & Revision Overlap
* **Problem:**
  - Sidebar contains two separate navigation items: "Mastery & Progress" and "Revision Plan".
  - Both screens show the same 4 metrics: 48% Mastery, 3 Mastered, 100% Quiz Accuracy, 1 Misconception Fixed.
  - Revision plan is simply a 3-item list (Today, Tomorrow, Later) floating in a corner.
* **Why it feels wrong:**
  - Blatant information redundancy. Forces the user to wonder what the difference is between "Progress" and "Revision".
  - Focuses heavily on vanity numbers rather than actionable guidance: "What do I know? What needs attention? What should I study right now?"
* **Proposed Solution:**
  - Consolidate into a single **Progress** hub.
  - Remove "Revision Plan" from primary sidebar navigation.
  - Structure Progress around the learner's journey:
    1. **Next Focus:** The #1 concept needing review based on misconception diagnoses or spaced repetition.
    2. **Concept Mastery Breakdown:** Mastered vs Improving vs Needs Attention with direct "Review" actions.
    3. **Revision Schedule:** Today / Tomorrow / Upcoming spaced review cards.
    4. **Recent Cognitive Activity:** Quiz results, teach-back scores, and study timeline.
* **Priority:** **P0 (Redundancy Elimination)**

---

### 8. Learning Preferences & Settings
* **Problem:**
  - Named "Configure AI Teacher" with a generic user icon.
  - Styled as a standard modal form with plain `<select>` and `<input>` elements.
  - Language selection is buried or displayed as a tiny cryptic "EN" button.
* **Why it feels wrong:**
  - Feels like an admin settings screen rather than a personal tutoring profile.
* **Proposed Solution:**
  - Rebrand as **Learning Preferences**.
  - Organize into clean, intuitive sections:
    - *Learner Profile* (Name, Education Level, Familiarity)
    - *Teaching Style* (Socratic, Visual & Examples, Step-by-Step, Rigorous)
    - *Language* (Auto, English, Hindi, Kannada, Telugu, Tamil with native scripts)
    - *Voice & Audio Feedback* (Mute, speed, natural browser speech engine)
    - *Accessibility* (Reduced motion, high contrast)
  - Beautiful segmented controls and responsive design.
* **Priority:** **P1 (High)**

---

### 9. Mobile & Responsive Layout
* **Problem:**
  - Squeezed 375px mobile viewport: sidebar stays open at 256px, message bubble text is clipped to 1-2 words per line.
  - Modals overflow screen bounds.
  - Chat composer overflows horizontally.
* **Why it feels wrong:**
  - Completely unusable on smartphones and tablets.
* **Proposed Solution:**
  - Mobile-first responsive breakpoints:
    - `<1024px`: Sidebar becomes a slide-out drawer with gesture support and backdrop blur.
    - `<1024px`: Teacher panel docks into a compact floating bar or collapsible top bar.
    - Right contextual panels (Artifacts, Sources) open as smooth bottom sheets on mobile.
    - Fixed bottom-anchored composer that respects safe areas (`env(safe-area-inset-bottom)`).
  - Explicit testing at 375px, 390px, 430px, 768px, 1024px, 1440px.
* **Priority:** **P0 (Mandatory Accessibility & Usability)**

---

## Architecture Plan & Action Items

| Item | Component / Area | Action | Target Aesthetic |
|---|---|---|---|
| 1 | Information Architecture | Consolidate nav: Home, Courses, Documents, Progress. Fold Revision into Progress. | Claude workspace cleanliness |
| 2 | Brand & Avatar | Replace cartoon SVG with futuristic digital AI teacher (`ProfessorNova.tsx`) with provider abstraction (`AvatarProvider.tsx`). | Minimalist, intelligent, holographic presence |
| 3 | Classroom / Lesson | Redesign `ClassroomWorkspace.tsx` into conversation-first, calm lesson with contextual artifact drawer. | Claude-style clean dialogue |
| 4 | Composer | Modern floating composer with Socratic/Explain toggles and voice fallback. | ChatGPT clean composer |
| 5 | Home Experience | Create `HomeScreen.tsx` ("Continue learning", recent courses, quiet progress summary). | Calm, welcoming personal studio |
| 6 | Course Workspace | Course-level tabs: Learn, Materials, Knowledge, Progress. | Notion/Linear level clarity |
| 7 | Knowledge Graph | Clear typography, readable node titles, no cryptic codes. | Obsidian/Roam elegance |
| 8 | Documents Hub | Clean document list, intelligent progressive status messages. | Calm file repository |
| 9 | Mobile Responsiveness | Drawer sidebar, bottom sheet artifacts, responsive composer. | Flawless mobile & tablet UX |
| 10 | Browser E2E Suite | Playwright automated testing for all 25 user flows. | Verified working application |

---
