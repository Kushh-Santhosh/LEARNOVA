"""
LEARNOVA Misconception Diagnostic Engine
Diagnoses student conceptual misunderstandings rather than merely flagging errors.
Outputs classified feedback, root-cause evidence, severity, and adaptive remediation strategy.
"""

import re
from typing import Dict, Any, Optional, List
from demo_data import DEMO_COMMON_MISCONCEPTIONS

class MisconceptionEngine:
    def __init__(self):
        self.rules = DEMO_COMMON_MISCONCEPTIONS
        
        # Additional common student misconceptions in technical domains
        self.additional_patterns = [
            {
                "pattern": r"(udp\s+is\s+reliable|faster\s+means\s+reliable|speed\s+makes\s+it\s+reliable)",
                "concept": "TCP vs UDP",
                "misconception": "Equating transmission speed with connection reliability.",
                "severity": "high",
                "evidence": "Section 3, Page 4-5: UDP provides zero acknowledgments or delivery guarantees.",
                "remediation_strategy": "Separate speed from reliability using the Registered Mail vs. Megaphone Postal Analogy."
            },
            {
                "pattern": r"(ip\s+address\s+is\s+physical|mac\s+is\s+logical|ip\s+is\s+burned\s+into\s+hardware)",
                "concept": "Network Layer Addressing",
                "misconception": "Confusing logical IP addresses with physical MAC hardware addresses.",
                "severity": "medium",
                "evidence": "Section 4, Page 6: IP is a logical routable address; MAC is local hardware identifier.",
                "remediation_strategy": "Contrast home street address (IP) with a citizen ID number (MAC)."
            },
            {
                "pattern": r"(osi\s+has\s+4\s+layers|tcp/ip\s+has\s+7\s+layers)",
                "concept": "OSI vs TCP/IP Architecture",
                "misconception": "Confusing the OSI 7-layer theoretical model with the practical 4-layer TCP/IP stack.",
                "severity": "low",
                "evidence": "Section 2, Page 2: OSI strictly defines 7 layers; TCP/IP compresses into 4.",
                "remediation_strategy": "Display side-by-side architectural mapping diagram."
            },
            {
                "pattern": r"(bandwidth\s+is\s+speed|more\s+bandwidth\s+means\s+lower\s+latency)",
                "concept": "Bandwidth vs Latency",
                "misconception": "Believing bandwidth determines propagation velocity.",
                "severity": "medium",
                "evidence": "Section 1, Page 1: Bandwidth is pipeline width (throughput); latency is travel time.",
                "remediation_strategy": "Use the highway analogy: more lanes (bandwidth) vs speed limit (latency)."
            }
        ]

    def diagnose(self, student_input: str, active_concept: Optional[str] = None) -> Dict[str, Any]:
        """
        Analyzes student statement.
        Returns classification: 'correct', 'partially_correct', 'incorrect', or 'misconception'.
        """
        cleaned = student_input.lower().strip()

        # Check for known misconception patterns
        for rule in self.additional_patterns:
            if re.search(rule["pattern"], cleaned):
                return {
                    "classification": "misconception",
                    "concept": rule["concept"],
                    "misconception": rule["misconception"],
                    "severity": rule["severity"],
                    "evidence": rule["evidence"],
                    "remediation_strategy": rule["remediation_strategy"],
                    "needs_remediation": True
                }

        # Check if the user input contains classic contradiction cues
        # e.g. "is always reliable without handshake"
        if "without handshake" in cleaned and "reliable" in cleaned:
            return {
                "classification": "misconception",
                "concept": "Reliability Mechanisms",
                "misconception": "Assuming reliability can exist without sequence negotiation or acknowledgments.",
                "severity": "high",
                "evidence": "Page 4: Reliable streams mandate state synchronization (handshake).",
                "remediation_strategy": "Explain why acknowledgments are mathematically necessary for lossless transfer.",
                "needs_remediation": True
            }

        # Check if the student says something explicitly negative/lost
        if any(neg in cleaned for neg in ["i don't understand", "i'm confused", "what does this mean", "explain simpler", "give example"]):
            return {
                "classification": "inquiry_needs_simplification",
                "concept": active_concept or "General",
                "misconception": None,
                "severity": "none",
                "evidence": None,
                "remediation_strategy": "analogy_and_visual",
                "needs_remediation": False
            }

        # Otherwise standard answer/statement
        return {
            "classification": "standard_statement",
            "concept": active_concept or "General",
            "misconception": None,
            "severity": "none",
            "evidence": None,
            "remediation_strategy": None,
            "needs_remediation": False
        }

misconception_engine = MisconceptionEngine()
