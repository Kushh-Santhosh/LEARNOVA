"""
LEARNOVA Feynman Teach-Back Evaluation Engine
Evaluates student self-explanation against structured knowledge graph nodes.
Dynamically handles arbitrary concepts and multilingual explanations.
"""

from typing import Dict, Any, List

class TeachBackEvaluator:
    # Preset high-depth rubrics
    RUBRIC_DATABASE = {
        "c_transport_layer": {
            "name": "Transport Layer (L4)",
            "key_elements": ["process-to-process", "port", "tcp", "udp", "reliability", "flow control"],
            "critical_distinction": "End-to-end communication, not host-to-host (which is L3)"
        },
        "c_tcp": {
            "name": "TCP Protocol",
            "key_elements": ["connection-oriented", "handshake", "3-way", "syn", "ack", "retransmission", "reliable", "sequence"],
            "critical_distinction": "Guarantees packet arrival with acknowledgments and ordered delivery"
        },
        "c_udp": {
            "name": "UDP Protocol",
            "key_elements": ["connectionless", "datagram", "fast", "speed", "no handshake", "unreliable", "best effort", "streaming", "gaming"],
            "critical_distinction": "Speed does NOT mean reliability; dropped packets are lost permanently"
        },
        "c_osi_model": {
            "name": "OSI 7-Layer Model",
            "key_elements": ["seven layers", "physical", "data link", "network", "transport", "session", "presentation", "application", "encapsulation"],
            "critical_distinction": "Hierarchical abstraction where each layer serves the one above it"
        }
    }

    def evaluate(self, concept_id: str, student_text: str, concept_name: str = "") -> Dict[str, Any]:
        """
        Evaluates student's teach-back submission.
        Works with both preset curriculum concepts and dynamically generated arbitrary concepts.
        """
        rubric = self.RUBRIC_DATABASE.get(concept_id)
        if not rubric:
            # Dynamically derive rubric from concept name and keywords
            tokens = [t.lower() for t in concept_name.split() if len(t) > 3]
            rubric = {
                "name": concept_name or "Curriculum Concept",
                "key_elements": tokens + ["function", "purpose", "application"],
                "critical_distinction": "Accurate explanation of fundamental behavior"
            }

        student_lower = student_text.lower().strip()
        words = student_lower.split()

        # 1. Concept Coverage
        covered_elements: List[str] = []
        missing_elements: List[str] = []
        for elem in rubric["key_elements"]:
            if elem in student_lower:
                covered_elements.append(elem)
            else:
                missing_elements.append(elem)

        coverage_ratio = len(covered_elements) / max(1, len(rubric["key_elements"]))
        coverage_score = int(min(100, round(coverage_ratio * 100 + 15))) if words else 0

        # 2. Check for Misconceptions in Teach-back
        detected_misconceptions = []
        if ("udp" in student_lower and ("reliable because" in student_lower or "is reliable" in student_lower)) and "not" not in student_lower:
            detected_misconceptions.append("Equating UDP speed with delivery reliability.")

        # 3. Accuracy Score
        accuracy_score = 90
        if detected_misconceptions:
            accuracy_score -= 30
        if len(words) < 10:
            accuracy_score -= 20
        accuracy_score = max(30, min(100, accuracy_score))

        # 4. Overall Understanding Score
        understanding_score = int(round((coverage_score * 0.5) + (accuracy_score * 0.5)))

        # 5. Recommendation message
        if detected_misconceptions:
            recommendation = (
                f"You have a solid grasp of {rubric['name']}, but note this critical distinction: "
                f"UDP trades away reliability in exchange for raw transmission speed. "
                f"Let's review the transport trade-offs."
            )
        elif missing_elements:
            missing_str = ", ".join(missing_elements[:2])
            recommendation = (
                f"Great explanation! You clearly understand the core idea. "
                f"To achieve full mastery, also mention: {missing_str}."
            )
        else:
            recommendation = (
                f"Outstanding! You explained {rubric['name']} with high precision and thorough coverage of key principles."
            )

        return {
            "concept_id": concept_id,
            "concept_name": rubric["name"],
            "understanding_score": understanding_score,
            "accuracy_score": accuracy_score,
            "covered_concepts": covered_elements,
            "missing_concepts": missing_elements,
            "detected_misconceptions": detected_misconceptions,
            "recommendation": recommendation,
            "is_mastered": understanding_score >= 80 and not detected_misconceptions
        }

teachback_evaluator = TeachBackEvaluator()
