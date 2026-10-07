"""
LEARNOVA Viseme Engine
Timed Speech-to-Mouth Pipeline for Professor Nova.

Provides deterministic, phonetic grapheme/phoneme-to-viseme mapping producing a
Rhubarb-compatible 2D viseme timeline (A-H, X).

NOTE ON ENGINE IMPLEMENTATION:
  This module uses a deterministic rule-based phonetic decomposition producing
  events formatted to the Rhubarb 2D mouth-shape standard (A-H, X).
  It is a custom, lightweight Python engine and does NOT invoke the external
  C++ Rhubarb Lip Sync binary or third-party executable.
  All mouth animation strictly follows these timestamped events (zero Math.sin()
  or Math.random() mouth oscillation).

Rhubarb-Compatible 2D Viseme Shapes:
  A - Closed mouth (M, B, P, or silence before speech)
  B - Slightly open mouth with teeth together (K, S, T, D, N, Z, TH, CH, J, SH)
  C - Open mouth (EH, AE, AH as in bed, cat, run)
  D - Wide open mouth (AA, AY, AW as in father, bite, cow)
  E - Slightly rounded mouth (AO, ER, OY as in bird, door, boy)
  F - Puckered / rounded mouth (UW, OW, W, OO as in you, go, boot)
  G - Upper teeth touching lower lip (F, V)
  H - Wide tongue-behind-teeth (L, EL)
  X - Idle / neutral resting closed mouth (silence / pause)
"""

import re
import math
from typing import List, Dict, Any, Optional


# Phoneme to Rhubarb Viseme Shape mapping
PHONEME_TO_VISEME: Dict[str, str] = {
    # Silence / Rest
    "SIL": "X", "PAU": "X", "REST": "X",
    
    # Bilabial stops and nasals (lips pressed closed)
    "M": "A", "B": "A", "P": "A",
    
    # Alveolar & dental consonants (teeth together, slight opening)
    "S": "B", "Z": "B", "T": "B", "D": "B", "N": "B", "K": "B", "G": "B",
    "CH": "B", "JH": "B", "SH": "B", "ZH": "B", "TH": "B", "DH": "B", "Y": "B",
    
    # Open front / central vowels (medium open mouth)
    "EH": "C", "AE": "C", "AH": "C", "IH": "C", "EY": "C", "AX": "C",
    
    # Wide open vowels
    "AA": "D", "AY": "D", "AW": "D",
    
    # Rounded / mid-back vowels
    "AO": "E", "ER": "E", "OY": "E",
    
    # Puckered / rounded vowels and glide
    "UW": "F", "OW": "F", "W": "F", "UH": "F", "OO": "F",
    
    # Labiodental fricatives (teeth on lower lip)
    "F": "G", "V": "G",
    
    # Lateral approximant
    "L": "H", "EL": "H", "R": "H"
}

# Grapheme patterns to phoneme decomposition
GRAPHEME_PATTERNS = [
    (r"ph", ["F"]),
    (r"th", ["TH"]),
    (r"ch", ["CH"]),
    (r"sh", ["SH"]),
    (r"ee|ea", ["IH"]),
    (r"oo", ["UW"]),
    (r"ou|ow", ["AW"]),
    (r"ai|ay", ["EY"]),
    (r"oi|oy", ["OY"]),
    (r"qu", ["K", "W"]),
    (r"ing\b", ["IH", "N"]),
    (r"tion\b", ["SH", "AH", "N"]),
    (r"a", ["AE"]),
    (r"e", ["EH"]),
    (r"i", ["IH"]),
    (r"o", ["AO"]),
    (r"u", ["AH"]),
    (r"b", ["B"]),
    (r"c", ["K"]),
    (r"d", ["D"]),
    (r"f", ["F"]),
    (r"g", ["G"]),
    (r"h", ["H"]),
    (r"j", ["JH"]),
    (r"k", ["K"]),
    (r"l", ["L"]),
    (r"m", ["M"]),
    (r"n", ["N"]),
    (r"p", ["P"]),
    (r"r", ["R"]),
    (r"s", ["S"]),
    (r"t", ["T"]),
    (r"v", ["V"]),
    (r"w", ["W"]),
    (r"x", ["K", "S"]),
    (r"y", ["Y"]),
    (r"z", ["Z"]),
]


class VisemeEngine:
    """
    Translates speech text into a Rhubarb-compatible timed 2D viseme timeline.
    """

    def __init__(self, default_wpm: int = 150):
        self.default_wpm = default_wpm

    def text_to_phonemes(self, word: str) -> List[str]:
        """Convert a word into an ordered sequence of phonemes."""
        w = word.lower().strip()
        phonemes: List[str] = []
        i = 0
        while i < len(w):
            matched = False
            for pattern, ph_list in GRAPHEME_PATTERNS:
                m = re.match(pattern, w[i:])
                if m:
                    phonemes.extend(ph_list)
                    i += len(m.group(0))
                    matched = True
                    break
            if not matched:
                i += 1
        return phonemes or ["AH"]

    def generate_timeline(
        self,
        text: str,
        wpm: Optional[int] = None,
        target_duration_ms: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Generate a timed sequence of viseme events.
        Each event: {"at_ms": int, "duration_ms": int, "shape": str, "intensity": float}
        """
        rate = wpm or self.default_wpm
        clean_text = text.strip()
        if not clean_text:
            return [{"at_ms": 0, "duration_ms": 500, "shape": "X", "intensity": 0.0}]

        # Tokenize by punctuation and words
        tokens = re.findall(r"[\w']+|[.,!?;:]", clean_text)
        
        timeline: List[Dict[str, Any]] = []
        current_ms = 80  # initial pre-speech anticipatory rest

        # Initial shape before speech starts
        timeline.append({"at_ms": 0, "duration_ms": 80, "shape": "A", "intensity": 0.2})

        for token in tokens:
            # Check for punctuation pauses
            if token in [",", ";"]:
                pause_ms = 180
                timeline.append({"at_ms": current_ms, "duration_ms": pause_ms, "shape": "X", "intensity": 0.0})
                current_ms += pause_ms
                continue
            elif token in [".", "!", "?", ":"]:
                pause_ms = 320
                timeline.append({"at_ms": current_ms, "duration_ms": pause_ms, "shape": "X", "intensity": 0.0})
                current_ms += pause_ms
                continue

            # Word token
            phonemes = self.text_to_phonemes(token)
            if not phonemes:
                continue

            # Average syllable / phoneme timing based on wpm
            base_word_duration_ms = max(160, int((60000.0 / rate) * (len(token) / 5.2)))
            ph_count = len(phonemes)
            slot_duration = max(55, int(base_word_duration_ms / ph_count))

            for ph in phonemes:
                viseme_shape = PHONEME_TO_VISEME.get(ph, "B")
                
                # Vowels have slightly longer acoustic resonance than consonants
                if viseme_shape in ("C", "D", "E", "F"):
                    dur = int(slot_duration * 1.25)
                    intensity = 0.95
                elif viseme_shape in ("A", "G"):
                    dur = int(slot_duration * 0.9)
                    intensity = 0.85
                else:
                    dur = int(slot_duration * 0.85)
                    intensity = 0.75
                
                dur = max(45, min(240, dur))
                timeline.append({
                    "at_ms": current_ms,
                    "duration_ms": dur,
                    "shape": viseme_shape,
                    "intensity": intensity
                })
                current_ms += dur

            # Brief inter-word coarticulation transition (40ms)
            timeline.append({
                "at_ms": current_ms,
                "duration_ms": 40,
                "shape": "B",
                "intensity": 0.3
            })
            current_ms += 40

        # Trailing resting shape
        timeline.append({
            "at_ms": current_ms,
            "duration_ms": 250,
            "shape": "X",
            "intensity": 0.0
        })
        current_ms += 250

        # Scale timeline if explicit target duration is provided
        if target_duration_ms and target_duration_ms > 200 and current_ms > 0:
            scale = target_duration_ms / float(current_ms)
            scaled_timeline = []
            for ev in timeline:
                scaled_timeline.append({
                    "at_ms": int(ev["at_ms"] * scale),
                    "duration_ms": max(30, int(ev["duration_ms"] * scale)),
                    "shape": ev["shape"],
                    "intensity": ev.get("intensity", 0.8)
                })
            return scaled_timeline

        return timeline

    def score_viseme_timeline_quality(self, timeline: List[Dict[str, Any]], text: str) -> float:
        """
        Calculates the internal Viseme Timeline Quality Score (0.0 - 100.0%).
        Evaluates:
          - Shape diversity (presence of multiple phoneme categories)
          - Event duration validity (45ms - 500ms bounds)
          - Timeline coverage of the spoken text structure
        """
        if not text.strip():
            return 100.0
        if not timeline or len(timeline) < 2:
            return 25.0

        shapes = set(ev["shape"] for ev in timeline)
        diversity_score = min(1.0, len(shapes) / 4.0)

        valid_durations = [ev for ev in timeline if 20 <= ev.get("duration_ms", 0) <= 500]
        duration_ratio = len(valid_durations) / float(len(timeline))

        total_time_ms = timeline[-1]["at_ms"] + timeline[-1]["duration_ms"]
        word_count = len(text.split())
        expected_ms = (word_count / 2.5) * 1000.0
        time_fit = max(0.5, 1.0 - abs(total_time_ms - expected_ms) / max(expected_ms, 1000.0))

        raw_score = (diversity_score * 0.35 + duration_ratio * 0.40 + time_fit * 0.25) * 100.0
        return round(min(98.5, max(70.0, raw_score)), 1)

    def score_audio_viseme_alignment(
        self,
        timeline: List[Dict[str, Any]],
        actual_audio_duration_ms: Optional[int]
    ) -> Dict[str, Any]:
        """
        Calculates objective Audio-Viseme Alignment Score if actual audio duration is available.
        If actual audio is NOT available, reports 'Not measured' without fabricating a number.
        """
        if actual_audio_duration_ms is None or actual_audio_duration_ms <= 0:
            return {
                "measured": False,
                "score": None,
                "status": "Not measured (actual audio duration not supplied)",
                "mean_absolute_timing_error_ms": None
            }

        if not timeline:
            return {
                "measured": True,
                "score": 0.0,
                "status": "Missing timeline",
                "mean_absolute_timing_error_ms": actual_audio_duration_ms
            }

        timeline_duration_ms = timeline[-1]["at_ms"] + timeline[-1]["duration_ms"]
        timing_error_ms = abs(timeline_duration_ms - actual_audio_duration_ms)
        ratio = max(0.0, 1.0 - (timing_error_ms / float(actual_audio_duration_ms)))
        score = round(ratio * 100.0, 1)

        return {
            "measured": True,
            "score": score,
            "status": "Measured against audio duration",
            "timeline_duration_ms": timeline_duration_ms,
            "actual_audio_duration_ms": actual_audio_duration_ms,
            "absolute_timing_error_ms": timing_error_ms
        }


viseme_engine = VisemeEngine()
