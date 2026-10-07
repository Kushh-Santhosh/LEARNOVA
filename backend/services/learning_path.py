"""
LEARNOVA Learning Path Service
Generates dynamic, structured learning curricula for any subject.
No hardcoded topic lists — curriculum is always generated via LLM.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Any, Dict
import json
import re


@dataclass
class LearningModule:
    order: int
    title: str
    description: str
    estimated_hours: float
    prerequisites: List[str] = field(default_factory=list)
    key_concepts: List[str] = field(default_factory=list)
    practice_project: Optional[str] = None


@dataclass
class LearningPath:
    goal: str
    learner_level: str
    total_modules: int
    estimated_total_hours: float
    modules: List[LearningModule]
    recommended_resources: List[Dict[str, str]] = field(default_factory=list)


class LearningPathService:
    """
    Generates structured learning paths for arbitrary goals via LLM.
    Falls back to a sensible scaffold if LLM is unavailable.
    """

    async def generate(
        self,
        goal: str,
        learner_level: str = "beginner",
        time_available: Optional[str] = None,
        preferred_language: Optional[str] = None,
        learning_style: Optional[str] = None,
        llm_caller=None,
    ) -> LearningPath:
        """
        Entry point. Tries LLM first; falls back to heuristic scaffold.

        Args:
            goal: What the learner wants to learn, e.g. "learn Python"
            learner_level: "beginner" | "intermediate" | "advanced"
            time_available: Optional hint like "2 hours/day" or "1 week"
            preferred_language: Locale hint, e.g. "en"
            learning_style: "visual" | "hands-on" | "reading" | None
            llm_caller: async callable(prompt, system_prompt) -> {"text": str} | None
        """
        if llm_caller:
            try:
                path = await self._generate_via_llm(
                    goal, learner_level, time_available, learning_style, llm_caller
                )
                if path:
                    return path
            except Exception:
                pass

        return self._generate_scaffold(goal, learner_level, time_available)

    # ------------------------------------------------------------------ #
    # LLM path                                                             #
    # ------------------------------------------------------------------ #

    async def _generate_via_llm(
        self,
        goal: str,
        level: str,
        time_available: Optional[str],
        style: Optional[str],
        llm_caller,
    ) -> Optional[LearningPath]:
        system = (
            "You are an expert curriculum designer. "
            "Given a learning goal, produce a structured JSON curriculum. "
            "Return ONLY valid JSON matching this schema (no markdown fences):\n"
            '{"modules":[{"order":1,"title":"...","description":"...","estimated_hours":2.0,'
            '"prerequisites":[],"key_concepts":["..."],"practice_project":"..."}]}'
        )
        prompt = (
            f"Learning goal: {goal}\n"
            f"Learner level: {level}\n"
            f"Time available: {time_available or 'not specified'}\n"
            f"Learning style: {style or 'general'}\n\n"
            "Create a comprehensive, ordered curriculum. "
            "Each module should build on the previous. "
            "Include 8-14 modules covering the subject end-to-end. "
            "Add a practical project to at least half the modules."
        )
        result = await llm_caller(prompt, system)
        if not result or not result.get("text"):
            return None

        raw = result["text"].strip()
        # Strip markdown fences if present
        raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()

        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            # Try to extract JSON object from within the text
            m = re.search(r"\{.*\}", raw, re.DOTALL)
            if not m:
                return None
            try:
                data = json.loads(m.group())
            except json.JSONDecodeError:
                return None

        raw_modules = data.get("modules", [])
        if not raw_modules:
            return None

        modules = [
            LearningModule(
                order=m.get("order", i + 1),
                title=m.get("title", f"Module {i+1}"),
                description=m.get("description", ""),
                estimated_hours=float(m.get("estimated_hours", 2.0)),
                prerequisites=m.get("prerequisites", []),
                key_concepts=m.get("key_concepts", []),
                practice_project=m.get("practice_project"),
            )
            for i, m in enumerate(raw_modules)
        ]

        total_hours = sum(m.estimated_hours for m in modules)
        return LearningPath(
            goal=goal,
            learner_level=level,
            total_modules=len(modules),
            estimated_total_hours=total_hours,
            modules=modules,
        )

    # ------------------------------------------------------------------ #
    # Heuristic scaffold (offline fallback)                                #
    # ------------------------------------------------------------------ #

    def _generate_scaffold(
        self, goal: str, level: str, time_available: Optional[str]
    ) -> LearningPath:
        """
        Builds a sensible generic scaffold when LLM is unavailable.
        Topic-agnostic — driven by the goal string.
        ponytail: simple linear scaffold, no branching. Upgrade path: use LLM.
        """
        subject = self._extract_subject(goal)
        phases = self._scaffold_phases(subject, level)
        modules = [
            LearningModule(
                order=i + 1,
                title=p["title"],
                description=p["description"],
                estimated_hours=p["hours"],
                key_concepts=p["concepts"],
                practice_project=p.get("project"),
            )
            for i, p in enumerate(phases)
        ]
        total_hours = sum(m.estimated_hours for m in modules)
        return LearningPath(
            goal=goal,
            learner_level=level,
            total_modules=len(modules),
            estimated_total_hours=total_hours,
            modules=modules,
        )

    def _extract_subject(self, goal: str) -> str:
        """Pull the core subject word(s) from the goal string."""
        goal_lower = goal.lower()
        for prefix in ["i want to learn ", "teach me ", "learn ", "study ", "help me with "]:
            if goal_lower.startswith(prefix):
                return goal[len(prefix):].strip().title()
        return goal.strip().title()

    def _scaffold_phases(self, subject: str, level: str) -> List[Dict[str, Any]]:
        """Generic 10-module scaffold adaptable to any subject."""
        return [
            {
                "title": f"Introduction to {subject}",
                "description": f"What {subject} is, why it matters, and where it is used.",
                "hours": 2.0,
                "concepts": ["Overview", "History", "Use cases"],
                "project": None,
            },
            {
                "title": "Core Concepts & Foundations",
                "description": f"The fundamental building blocks that underpin {subject}.",
                "hours": 3.0,
                "concepts": ["Key definitions", "Mental models", "First principles"],
                "project": f"First hands-on {subject} exercise",
            },
            {
                "title": "Basic Syntax & Structure",
                "description": "Hands-on practice with the core syntax and structure.",
                "hours": 4.0,
                "concepts": ["Syntax rules", "Structure", "Patterns"],
                "project": f"Build a minimal {subject} example from scratch",
            },
            {
                "title": "Working with Data & State",
                "description": "Managing information, state, and data flow.",
                "hours": 3.5,
                "concepts": ["Data types", "State management", "Data flow"],
                "project": None,
            },
            {
                "title": "Control Flow & Logic",
                "description": "Conditionals, loops, branching, and decision logic.",
                "hours": 3.0,
                "concepts": ["Conditionals", "Loops", "Logic"],
                "project": "Logic exercise with real-world scenario",
            },
            {
                "title": "Functions & Modularity",
                "description": "Structuring code or concepts into reusable units.",
                "hours": 3.0,
                "concepts": ["Functions", "Reusability", "Abstraction"],
                "project": f"Refactor the {subject} exercise using functions",
            },
            {
                "title": "Intermediate Patterns",
                "description": "Patterns and techniques used in real-world applications.",
                "hours": 4.0,
                "concepts": ["Common patterns", "Best practices", "Debugging"],
                "project": "Intermediate project applying new patterns",
            },
            {
                "title": "Error Handling & Robustness",
                "description": "Handling failures, edge cases, and writing reliable code.",
                "hours": 2.5,
                "concepts": ["Error handling", "Edge cases", "Testing"],
                "project": None,
            },
            {
                "title": "Real-World Application",
                "description": "Applying everything to a realistic, complete project.",
                "hours": 5.0,
                "concepts": ["Integration", "Architecture", "Deployment"],
                "project": f"Build a complete {subject} application",
            },
            {
                "title": "Next Steps & Ecosystem",
                "description": "Libraries, tools, career paths, and community resources.",
                "hours": 2.0,
                "concepts": ["Ecosystem", "Libraries", "Community", "Further learning"],
                "project": None,
            },
        ]


# Singleton
learning_path_service = LearningPathService()


# Self-check (ponytail: minimal, no framework)
if __name__ == "__main__":
    import asyncio

    async def _check():
        path = learning_path_service._generate_scaffold("Learn Python", "beginner", None)
        assert path.total_modules == 10
        assert path.modules[0].title.lower().startswith("intro")
        assert path.estimated_total_hours > 0
        print(f"OK — {path.total_modules} modules, {path.estimated_total_hours:.1f}h total")

    asyncio.run(_check())
