# LEARNOVA — AI Avatar & Real-Time Voice Architecture

## 1. Architectural Principle: "The Avatar is Not the Brain"

In naive AI applications, the avatar service is often given direct prompt instructions and allowed to generate raw, ungrounded conversational responses. In LEARNOVA, this anti-pattern is strictly forbidden.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        LEARNOVA TEACHER BRAIN                          │
│  (Pedagogy Engine, Grounded RAG, Learner Model, Misconception Engine)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                  Structured Teaching Decision JSON
                  - spoken_text (1-3 concise sentences)
                  - teacher_text (Detailed markdown)
                  - visual_element (Flowchart/Comparison/Diagram)
                  - citations (Page/Section Provenance)
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     LIVEKIT REALTIME NERVOUS SYSTEM                    │
│   (WebRTC Low-Latency Transport, VAD, Speech Interruption Handling)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                    LIVEAVATAR / HEYGEN / LOCAL CANVAS                  │
│       (Photorealistic Visual Delivery, Lip-Sync, Eye-Contact)          │
└────────────────────────────────────────────────────────────────────────┘
```

- **LEARNOVA = The Brain:** Owns pedagogical intent, document facts, misconception tracking, and mastery memory.
- **LiveKit = The Nervous System:** Manages WebRTC bidirectional audio, voice activity detection (VAD), and low-latency audio buffering.
- **LiveAvatar = The Body:** Serves strictly as the photorealistic presentation layer with facial gestures, natural lip-sync, and camera gaze.

---

## 2. Server-Side Avatar Session & Token Security
Security is an uncompromising requirement. Under no circumstances are provider API keys (such as `HEYGEN_API_KEY` or `LIVEAVATAR_API_KEY`) exposed to the client bundle.

### **Session Token Flow:**
1. Frontend calls `GET /api/avatar/session`.
2. Backend verifies learner authentication and checks whether `HEYGEN_API_KEY` is present.
3. If configured:
   - Backend calls the HeyGen LiveAvatar API server-side to generate an ephemeral, short-lived WebRTC session token (`session_id` + `token`).
   - The token expires automatically after the session ends.
4. If unconfigured:
   - Backend returns `mode: "fallback"` with an internal session ID.
   - The frontend transitions gracefully to the canvas/SVG animated avatar without throwing errors or breaking the UI.

---

## 3. Avatar State Machine
The AI teacher transitions smoothly across seven deterministic states:

| State | Visual Indicator | Behavior |
|---|---|---|
| **Connecting** | Amber Pulsing Indicator | Initializing WebRTC peer connection and audio sink |
| **Idle** | Calm Gray Dot | Professor Nova maintains subtle eye contact and natural breathing |
| **Listening** | Emerald Glowing Ring | Learner is speaking; VAD is capturing streaming microphone input |
| **Thinking** | Blue Rotating Arc | Query is being aligned, RAG retrieval executing, teacher decision formulating |
| **Speaking** | Subtle Waveform Animation | Avatar vocalizes concise speech with real-time lip synchronization |
| **Interrupted** | Quick Orange Flash | Learner spoke during speech; audio buffer instantly purged |
| **Fallback** | Neutral Status Tag | Local SVG/Canvas avatar active with synthesized browser speech |

---

## 4. Spoken Script vs. Workspace Dual-Delivery
Real human teachers do not read entire textbooks aloud to a student. Doing so creates acute cognitive fatigue and sluggish interactions.

LEARNOVA implements **Dual-Delivery Output**:
1. **Spoken Output (`spoken_text`):**
   - Strictly 1 to 3 conversational sentences (100–250 characters).
   - Conversational, warm, and natural.
   - Points the learner's attention to the whiteboard: *"Take a look at the demultiplexing flow on your right."*
2. **Workspace Output (`teacher_text`):**
   - Deep, structured educational markdown.
   - Includes bullet points, equations, bold definitions, and interactive checks.
   - Displayed simultaneously in the center conversation and right Learning Artifact panel.

---

## 5. Instant Interruption & Cancellation
A genuine classroom dialogue requires the student to be able to interrupt when confused.
- **Voice Activity Detection (VAD):** Detects when the user begins speaking while the avatar is in the `Speaking` state.
- **Buffer Cancellation:** Triggers an immediate `cancel_speech()` event over the WebRTC datachannel, silencing the audio stream and returning the avatar to the `Listening` state within <150ms.
- **State Update:** In the transcript, the teacher's previous statement is marked as `[Interrupted]` and the learner's new inquiry is processed immediately.

---

## 6. High-Fidelity Local Fallback
When API credentials are not set in `.env`:
- LEARNOVA provides an elegant vector-animated avatar representing Professor Nova.
- Smooth CSS and SVG morphing simulate eye-blinks, brow movement, and phoneme-based mouth articulation.
- Spoken audio is rendered via the browser's native `SpeechSynthesis` API with pitch and rate tailored for university-level lecture pacing.
- The UI never displays broken video boxes or missing asset icons.
