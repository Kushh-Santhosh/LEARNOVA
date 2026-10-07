"""
LEARNOVA Expression Engine
Facial Expression Planning for Professor Nova.

Generates timed, contextual facial expression events based on teacher intent,
pedagogical stage, tone, punctuation, and explicit emotion cues.

Supported Expressions:
  - idle: Relaxed, attentive baseline
  - listening: Forward attention, alert eyes
  - thinking: Upward gaze, reflective brow
  - explaining: Confident, articulative teaching presence
  - encouraging: Warm smile, supportive head tilt
  - celebrating: High energy, delighted smile, achievement sparkle
  - remediating: Empathetic, calm, patient guidance
  - questioning: Raised inquisitive brow, curious gaze
"""

import re
from typing import List, Dict, Any, Optional

VALID_EXPRESSIONS = {
    "idle",
    "listening",
    "thinking",
    "explaining",
    "encouraging",
    "celebrating",
    "remediating",
    "questioning",
}

# Lexical indicators for expression detection
CELEBRATORY_PATTERNS = [
    r"\b(excellent|awesome|fantastic|brilliant|great job|congratulations|perfect|nailed it|100%|spot on)\b",
    r"\b(well done|superb|outstanding|bravo)\b"
]

ENCOURAGING_PATTERNS = [
    r"\b(good try|almost there|you've got this|keep going|on the right track|proud of you)\b",
    r"\b(step by step|let's keep going|nice work)\b"
]

REMEDIATING_PATTERNS = [
    r"\b(common misconception|actually|careful here|let's clarify|notice that|not quite|instead of)\b",
    r"\b(don't worry|let's break it down|revisit|let's see why)\b"
]

THINKING_PATTERNS = [
    r"\b(let's consider|let's analyze|reflect on|ponder|imagine|what if)\b",
    r"^\s*(hmm|well|let's see)\b"
]


class ExpressionEngine:
    """
    Plans timed facial expression trajectories matching spoken speech.
    """

    def detect_dominant_expression(self, text: str, emotion_hint: Optional[str] = None) -> str:
        """Classifies text into the most appropriate primary expression."""
        if emotion_hint and emotion_hint.lower() in VALID_EXPRESSIONS:
            return emotion_hint.lower()

        lower = text.lower().strip()

        # Check celebratory
        for p in CELEBRATORY_PATTERNS:
            if re.search(p, lower):
                return "celebrating"

        # Check remediating
        for p in REMEDIATING_PATTERNS:
            if re.search(p, lower):
                return "remediating"

        # Check encouraging
        for p in ENCOURAGING_PATTERNS:
            if re.search(p, lower):
                return "encouraging"

        # Check thinking
        for p in THINKING_PATTERNS:
            if re.search(p, lower):
                return "thinking"

        # Check question
        if lower.endswith("?") or re.search(r"\b(can you tell me|what do you think|how would you)\b", lower):
            return "questioning"

        return "explaining"

    def generate_timeline(
        self,
        text: str,
        total_duration_ms: int,
        emotion_hint: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Creates a timed sequence of expression events.
        Example event: {"at_ms": 0, "duration_ms": 1800, "expression": "explaining"}
        """
        if total_duration_ms <= 0:
            total_duration_ms = 2000

        dominant = self.detect_dominant_expression(text, emotion_hint)

        # If utterance is short (< 3.0s), hold one strong consistent expression
        if total_duration_ms < 3000:
            return [{
                "at_ms": 0,
                "duration_ms": total_duration_ms,
                "expression": dominant,
                "intensity": 0.9
            }]

        # For longer utterances, build a dynamic pedagogical curve
        timeline: List[Dict[str, Any]] = []
        sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]

        if len(sentences) <= 1:
            # Single longer sentence: Start explaining, transition to dominant/questioning
            half_ms = int(total_duration_ms * 0.6)
            timeline.append({
                "at_ms": 0,
                "duration_ms": half_ms,
                "expression": "explaining" if dominant != "explaining" else dominant,
                "intensity": 0.85
            })
            timeline.append({
                "at_ms": half_ms,
                "duration_ms": total_duration_ms - half_ms,
                "expression": dominant if dominant != "explaining" else ("questioning" if text.strip().endswith("?") else "encouraging"),
                "intensity": 0.9
            })
            return timeline

        # Multi-sentence progression
        ms_per_sentence = int(total_duration_ms / len(sentences))
        curr_ms = 0

        for i, s in enumerate(sentences):
            dur = ms_per_sentence if i < len(sentences) - 1 else (total_duration_ms - curr_ms)
            s_expr = self.detect_dominant_expression(s)
            
            # If final sentence ends in question, ensure questioning
            if i == len(sentences) - 1 and s.strip().endswith("?"):
                s_expr = "questioning"
            # If first sentence and no strong emotion, start explaining
            elif i == 0 and s_expr in ("idle", "explaining"):
                s_expr = "explaining"

            timeline.append({
                "at_ms": curr_ms,
                "duration_ms": dur,
                "expression": s_expr,
                "intensity": 0.88
            })
            curr_ms += dur

        return timeline


expression_engine = ExpressionEngine()
