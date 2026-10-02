"""
LEARNOVA Evidence-Grounded Learner State & Analytics Engine
Maintains an evidentiary ledger for every mastery delta (quizzes, teach-backs, misconceptions).
Generates an explainable 3-day revision plan based on real performance.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime

class LearnerState:
    def __init__(self):
        self.profile = {
            "name": "Alex Mercer",
            "education_level": "Undergraduate",
            "learning_level": "Beginner",
            "preferred_style": "Examples & Visuals",
            "language": "en"
        }
        # Concept ID -> Mastery score (0.0 to 1.0)
        self.concept_mastery: Dict[str, float] = {
            "c_packet_switching": 0.35,
            "c_osi_model": 0.50,
            "c_transport_layer": 0.40,
            "c_tcp": 0.30,
            "c_udp": 0.20,
            "c_network_layer": 0.15,
            "c_encapsulation": 0.25
        }
        # Evidence ledger: every delta has an auditable record
        self.evidence_ledger: List[Dict[str, Any]] = [
            {
                "timestamp": datetime.now().isoformat(),
                "concept": "c_osi_model",
                "delta": 0.10,
                "reason": "Initial curriculum assessment completed",
                "type": "diagnostic"
            }
        ]
        self.misconception_log: List[Dict[str, Any]] = []
        self.quiz_attempts: List[Dict[str, Any]] = []
        self.teachback_sessions: List[Dict[str, Any]] = []
        self.recent_activity: List[Dict[str, Any]] = [
            {"time": "Just now", "action": "Initialized LEARNOVA Workspace", "type": "system"}
        ]

    def update_profile(self, name: str, education_level: str, learning_level: str, preferred_style: str, language: str = "en"):
        self.profile.update({
            "name": name,
            "education_level": education_level,
            "learning_level": learning_level,
            "preferred_style": preferred_style,
            "language": language
        })

    def record_concept_interaction(self, concept_id: str, delta: float = 0.05, reason: str = "Lesson exploration"):
        """Increases or updates mastery of concept with an auditable evidence entry."""
        current = self.concept_mastery.get(concept_id, 0.2)
        new_score = max(0.05, min(1.0, current + delta))
        self.concept_mastery[concept_id] = round(new_score, 2)
        
        self.evidence_ledger.insert(0, {
            "timestamp": datetime.now().isoformat(),
            "concept": concept_id,
            "delta": delta,
            "new_score": round(new_score, 2),
            "reason": reason,
            "type": "interaction"
        })
        self.recent_activity.insert(0, {
            "time": "Just now",
            "action": f"Studied {concept_id.replace('c_', '').replace('_', ' ').title()}",
            "type": "study"
        })

    def record_misconception(self, misconception_info: Dict[str, Any]):
        self.misconception_log.insert(0, {
            "timestamp": datetime.now().isoformat(),
            "concept": misconception_info.get("concept"),
            "misconception": misconception_info.get("misconception"),
            "severity": misconception_info.get("severity"),
            "status": "active"
        })
        concept_slug = f"c_{misconception_info.get('concept', '').lower().replace(' ', '_')}"
        if concept_slug in self.concept_mastery:
            self.concept_mastery[concept_slug] = max(0.1, round(self.concept_mastery[concept_slug] - 0.10, 2))
        
        self.evidence_ledger.insert(0, {
            "timestamp": datetime.now().isoformat(),
            "concept": concept_slug,
            "delta": -0.10,
            "reason": f"Misconception diagnosed: {misconception_info.get('misconception')}",
            "type": "misconception"
        })

    def resolve_misconception(self, concept_name: str):
        """Marks a misconception as resolved after the student demonstrates correct comprehension."""
        for item in self.misconception_log:
            if item.get("concept") == concept_name and item.get("status") == "active":
                item["status"] = "resolved"
                item["resolved_at"] = datetime.now().isoformat()
                self.record_concept_interaction(
                    f"c_{concept_name.lower().replace(' ', '_')}",
                    delta=0.15,
                    reason=f"Misconception resolved with counterexample verification"
                )
                break

    def record_quiz_result(self, quiz_id: str, concept: str, is_correct: bool, score: int):
        self.quiz_attempts.append({
            "quiz_id": quiz_id,
            "concept": concept,
            "is_correct": is_correct,
            "score": score,
            "timestamp": datetime.now().isoformat()
        })
        delta = 0.15 if is_correct else -0.05
        matched_id = next((k for k in self.concept_mastery if concept.lower() in k.lower()), "c_transport_layer")
        self.record_concept_interaction(
            matched_id,
            delta=delta,
            reason=f"Quiz completed with score {score}% ({'Correct' if is_correct else 'Incorrect'})"
        )

    def record_teachback(self, eval_result: Dict[str, Any]):
        self.teachback_sessions.append(eval_result)
        concept_id = eval_result.get("concept_id", "c_transport_layer")
        understanding = eval_result.get("understanding_score", 50)
        new_mastery = round(understanding / 100.0, 2)
        self.concept_mastery[concept_id] = new_mastery
        
        self.evidence_ledger.insert(0, {
            "timestamp": datetime.now().isoformat(),
            "concept": concept_id,
            "delta": None,
            "new_score": new_mastery,
            "reason": f"Feynman Teach-Back evaluated at {understanding}% understanding",
            "type": "teach_back"
        })
        self.recent_activity.insert(0, {
            "time": "Just now",
            "action": f"Completed Teach-Back for {eval_result.get('concept_name', 'topic')} ({understanding}%)",
            "type": "teach_back"
        })

    def get_analytics(self) -> Dict[str, Any]:
        """Calculates true mastery numbers from interactions."""
        total_concepts = max(1, len(self.concept_mastery))
        avg_mastery = sum(self.concept_mastery.values()) / total_concepts
        
        mastered = []
        improving = []
        needs_review = []

        for cid, score in self.concept_mastery.items():
            name = cid.replace("c_", "").replace("_", " ").title()
            item = {"id": cid, "name": name, "score": int(score * 100)}
            if score >= 0.70:
                mastered.append(item)
            elif score >= 0.35:
                improving.append(item)
            else:
                needs_review.append(item)

        quizzes_taken = len(self.quiz_attempts)
        quiz_correct = sum(1 for q in self.quiz_attempts if q.get("is_correct"))
        quiz_accuracy = int((quiz_correct / quizzes_taken * 100)) if quizzes_taken > 0 else 0

        revision_plan = self._generate_revision_plan(needs_review, improving)

        return {
            "learner_profile": self.profile,
            "overall_mastery_pct": int(avg_mastery * 100),
            "concepts_mastered": len(mastered),
            "concepts_improving": len(improving),
            "concepts_needs_review": len(needs_review),
            "mastered_list": mastered,
            "improving_list": improving,
            "needs_review_list": needs_review,
            "quiz_stats": {
                "total_taken": quizzes_taken,
                "correct_count": quiz_correct,
                "accuracy_pct": quiz_accuracy
            },
            "misconception_count": len(self.misconception_log),
            "recent_activity": self.recent_activity[:6],
            "revision_plan": revision_plan,
            "recent_evidence": self.evidence_ledger[:5]
        }

    def _generate_revision_plan(self, needs_review: List[Dict[str, Any]], improving: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        plan = []
        if needs_review:
            first_weak = needs_review[0]["name"]
            plan.append({
                "timeframe": "Today",
                "task": f"Review {first_weak} foundations & clarify key distinctions",
                "priority": "High"
            })
        if len(needs_review) > 1:
            second_weak = needs_review[1]["name"]
            plan.append({
                "timeframe": "Tomorrow",
                "task": f"Practice scenario check on {second_weak}",
                "priority": "Medium"
            })
        elif improving:
            imp_name = improving[0]["name"]
            plan.append({
                "timeframe": "Tomorrow",
                "task": f"Strengthen {imp_name} through Feynman Teach-Back Challenge",
                "priority": "Medium"
            })
            
        plan.append({
            "timeframe": "In 3 Days",
            "task": "Complete Full Module Review on Transport Layer protocols",
            "priority": "Normal"
        })
        return plan

learner_state = LearnerState()
