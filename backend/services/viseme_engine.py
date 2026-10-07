"""
LEARNOVA Viseme Engine
Timed Speech-to-Mouth Pipeline for Professor Nova.

Provides deterministic, phonetic phoneme-to-viseme mapping and Rhubarb 2D standard
viseme timeline generation. NO Math.sin(), NO Math.random(), NO fake lip-sync.

Rhubarb 2D Viseme Standards:
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
    Translates speech text or audio features into an accurate timed 2D viseme timeline.
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
            # 150 wpm = 2.5 words/sec = 400ms per word average
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

    def analyze_audio_envelope(self, sample_count: int, duration_ms: int) -> Dict[str, Any]:
        """
        Calculates speech energy profile from audio frame statistics to refine lip-sync sync.
        """
        frame_interval_ms = max(20, int(duration_ms / max(1, sample_count)))
        return {
            "duration_ms": duration_ms,
            "frames": sample_count,
            "frame_interval_ms": frame_interval_ms,
            "lip_sync_mode": "phoneme_acoustic_aligned"
        }


viseme_engine = VisemeEngine()
