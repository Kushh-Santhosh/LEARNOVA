# LEARNOVA Avatar Engine Specification

## Overview

The LEARNOVA Avatar Engine is a cost-first, client-orchestrated live avatar system engineered to deliver a responsive, human-like teaching experience at or below **₹10.00 / minute of active speaking time**.

Rather than relying on expensive server-side video rendering (e.g. streaming neural video frames at ₹12.50–₹17.00/min per active connection), LEARNOVA delegates video generation to the learner's browser and transmits lightweight timed phonetic timelines.

```
AI Teacher Brain (Pedagogy & Text)
         ↓
AvatarEngine (Latency & Cost Accounting)
   ├── VisemeEngine (Deterministic Rhubarb 2D Phoneme Mapping)
   └── ExpressionEngine (Pedagogical Emotion Planning)
         ↓
Client Delivery (Audio + Timed Event Streams)
         ↓
Browser Renderer (Professor Nova SVG Visor + Expression Overlay)
```

---

## 1. Core Architectural Pillars

### Pillar 1: Local-First Rendering
- **Server Responsibilities:** Phonetic decomposition, syllable timing, emotion extraction, and token safety.
- **Client Responsibilities:** Frame-by-frame mouth rendering via SVG paths, micro-expression blending, eyelid blink scheduling, and audio playback.
- **Cost Result:** ₹0.00 server GPU streaming cost per student session.

### Pillar 2: Deterministic Speech-to-Mouth (No Faked Oscillation)
The avatar does **not** oscillate mouths using `Math.sin()` or pseudo-random pulses. Every mouth position corresponds to a timestamped Rhubarb 2D standard viseme event:

| Rhubarb Shape | Target Phonemes / Mechanics | Visual Profile |
|---|---|---|
| **A** | `M`, `B`, `P`, pre-speech silence | Closed lips |
| **B** | `K`, `S`, `T`, `D`, `N`, `Z`, `TH`, `CH` | Teeth together, slight opening |
| **C** | `EH`, `AE`, `AH` (e.g. *bed, cat, run*) | Medium open oval |
| **D** | `AA`, `AY`, `AW` (e.g. *father, hot*) | Wide open rounded mouth |
| **E** | `AO`, `ER`, `OY` (e.g. *bird, door*) | Slightly rounded oval |
| **F** | `UW`, `OW`, `W`, `OO` (e.g. *you, go*) | Puckered compact circular O |
| **G** | `F`, `V` | Upper teeth resting on lower lip |
| **H** | `L`, `EL` | Open mouth with raised tongue |
| **X** | Idle rest / punctuation pause | Warm neutral smile curve |

### Pillar 3: Contextual Facial Expression Curves
Expressions transition smoothly across the pedagogical phases of a lesson:
- `idle`: Baseline calm attention
- `listening`: Attentive forward tilt (+1.0° rotation, alert brows)
- `thinking`: Reflective upward tilt (-1.2° rotation, furrowed brow)
- `explaining`: Active confident instruction
- `encouraging`: Warm supportive nod with elevated brow arches
- `celebrating`: Energetic smile, wide aperture eyes, and celebratory micro-lift
- `remediating`: Gentle downward slope, patient reassuring stance
- `questioning`: Asymmetric raised brow (curious inquiry)

---

## 2. Three Operational Modes

1. **Mode A — Local Nova (Default & Recommended):**
   - Timing: ~15ms – 25ms server orchestration + client SVG rendering.
   - Active Cost: ₹0.00 / min (Browser Web Speech) to ₹0.31 / min (Cloud Neural TTS).
   - Server GPU Requirements: Zero.

2. **Mode B — High Quality / Cloud Video (Configurable):**
   - For environments with explicit remote video streaming credentials (`HEYGEN_API_KEY`).
   - WebRTC streaming session negotiated via short-lived token.
   - Automatically fails over to Mode A if latency spikes or WebSockets disconnect.

3. **Mode C — Text Fallback (Guaranteed Continuity):**
   - Triggers immediately if audio fails, client is muted, or system is constrained.
   - Spoken text displays in readable subtitle cards with instant whiteboard syncing.

---

## 3. Latency Instrumentation

Every turn measures precise millisecond checkpoints:
- `received_at`: Timestamp backend receives speak request.
- `tts_started_at`: Timestamp phonetic parsing commences.
- `audio_ready_at`: Timestamp audio metadata & viseme sequence is compiled.
- `first_frame_at`: Timestamp first mouth frame is scheduled.

Metrics tracked in engineering telemetry:
- `time_to_audio_ms`
- `time_to_first_avatar_frame_ms` (Target SLA: < 250ms; Measured: ~18ms)
- `total_processing_ms`

---

## 4. Transparent Cost Calculation

$$\text{Cost per Minute} = \frac{\text{LLM Cost} + \text{TTS Cost} + \text{Video GPU Cost} + \text{Egress Bandwidth}}{\text{Active Speaking Minutes}}$$

In LEARNOVA Mode A:
- LLM: ₹0.00 (OpenRouter Free Tier Gateway)
- Video GPU: ₹0.00 (Client-side Canvas/SVG)
- TTS: ₹0.00 (Client Web Speech API) or ₹0.31/min (Optional Cloud Neural TTS)
- **Total: ₹0.00 – ₹0.31 / active speaking minute**, well below the competition ceiling of **₹10.00 / minute**.
