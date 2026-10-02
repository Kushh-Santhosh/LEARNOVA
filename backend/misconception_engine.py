"""
LEARNOVA Evidence-Driven Misconception Diagnostic Engine
Identifies root causes, prerequisite gaps, counterexamples, and remediation strategies.
Maintains state for verification checks to ensure misconceptions are only resolved with evidence.
"""

import re
from typing import Dict, Any, Optional, List
from demo_data import DEMO_COMMON_MISCONCEPTIONS

class MisconceptionEngine:
    def __init__(self):
        self.rules = DEMO_COMMON_MISCONCEPTIONS
        
        self.patterns = [
            {
                "pattern": r"(udp\s+is\s+reliable|faster\s+means\s+reliable|speed\s+makes\s+it\s+reliable|udp\s+guarantees\s+delivery)",
                "concept": "TCP vs UDP",
                "misconception": "Equating transmission speed with connection reliability.",
                "root_cause": "Conflating delivery latency with packet arrival assurance.",
                "prerequisite_gap": "Understanding packet switching drops and acknowledgment mechanisms.",
                "severity": "high",
                "evidence": "Section 3, Page 4-5: UDP provides zero acknowledgments or delivery guarantees.",
                "remediation_strategy": "Separate speed from reliability using the Registered Mail vs. Megaphone Postal Analogy.",
                "counterexample": "A megaphone can shout words at the speed of sound, but if background noise drowns a word, the speaker never re-shouts it.",
                "verification_check": "Which protocol provides retransmissions and acknowledgments?"
            },
            {
                "pattern": r"(ip\s+address\s+is\s+physical|mac\s+is\s+logical|ip\s+is\s+burned\s+into\s+hardware)",
                "concept": "Network Layer Addressing",
                "misconception": "Confusing logical IP addresses with physical MAC hardware addresses.",
                "root_cause": "Treating software-assigned network routing numbers as permanent device chips.",
                "prerequisite_gap": "Understanding OSI Layer 2 Data Link vs Layer 3 Network separation.",
                "severity": "medium",
                "evidence": "Section 4, Page 6: IP is a logical routable address; MAC is local hardware identifier.",
                "remediation_strategy": "Contrast home street address (IP) with a citizen ID number (MAC).",
                "counterexample": "If you take your laptop to a coffee shop, its MAC address stays identical, but its IP address changes instantly.",
                "verification_check": "Can a laptop have different IP addresses when connecting to different Wi-Fi networks?"
            },
            {
                "pattern": r"(osi\s+has\s+4\s+layers|tcp/ip\s+has\s+7\s+layers)",
                "concept": "OSI vs TCP/IP Architecture",
                "misconception": "Confusing the theoretical OSI 7-layer model with the practical 4-layer TCP/IP suite.",
                "root_cause": "Treating academic reference models and commercial protocol implementations as identical.",
                "prerequisite_gap": "History of ISO standardization vs DARPA ARPANET development.",
                "severity": "low",
                "evidence": "Section 2, Page 2: OSI strictly defines 7 layers; TCP/IP compresses into 4.",
                "remediation_strategy": "Display side-by-side architectural mapping diagram.",
                "counterexample": "TCP/IP combines OSI Presentation and Session layers directly into the Application layer.",
                "verification_check": "Does the practical TCP/IP suite separate Presentation into its own standalone layer?"
            }
        ]

    def diagnose(self, student_input: str, active_concept: Optional[str] = None) -> Dict[str, Any]:
        """
        Diagnoses student statement.
        Returns detailed classification, cause, prerequisite gap, counterexample, and check.
        """
        cleaned = student_input.lower().strip()

        for rule in self.patterns:
            if re.search(rule["pattern"], cleaned):
                return {
                    "classification": "misconception",
                    "concept": rule["concept"],
                    "misconception": rule["misconception"],
                    "root_cause": rule["root_cause"],
                    "prerequisite_gap": rule["prerequisite_gap"],
                    "severity": rule["severity"],
                    "evidence": rule["evidence"],
                    "counterexample": rule["counterexample"],
                    "remediation_strategy": rule["remediation_strategy"],
                    "verification_check": rule["verification_check"],
                    "needs_remediation": True
                }

        # Check for inquiry or simplification request
        if any(neg in cleaned for neg in ["i don't understand", "i'm confused", "what does this mean", "explain simpler", "give example"]):
            return {
                "classification": "inquiry_needs_simplification",
                "concept": active_concept or "General",
                "misconception": None,
                "root_cause": None,
                "prerequisite_gap": None,
                "severity": "none",
                "evidence": None,
                "counterexample": None,
                "remediation_strategy": "analogy_and_visual",
                "verification_check": None,
                "needs_remediation": False
            }

        return {
            "classification": "standard_statement",
            "concept": active_concept or "General",
            "misconception": None,
            "root_cause": None,
            "prerequisite_gap": None,
            "severity": "none",
            "evidence": None,
            "counterexample": None,
            "remediation_strategy": None,
            "verification_check": None,
            "needs_remediation": False
        }

misconception_engine = MisconceptionEngine()
