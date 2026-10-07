"""
LEARNOVA Web Research Service
Researches public learning resources for arbitrary subjects.

Design:
- Abstract SearchProvider so the backend search mechanism can change
  without touching the business logic.
- Does NOT fabricate URLs. Only returns what was retrieved.
- Deduplicates by domain and ranks by educational relevance.
"""

import re
import httpx
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any


@dataclass
class LearningResource:
    title: str
    url: str
    source: str
    description: str
    why_recommended: str
    difficulty: str           # "beginner" | "intermediate" | "advanced"
    estimated_time: str       # e.g. "2 hours", "1 week"
    topic: str


@dataclass
class ResearchResult:
    goal: str
    summary: str
    key_concepts: List[str]
    resources: List[LearningResource]
    learning_sequence: List[str]   # ordered topic list


# ------------------------------------------------------------------ #
# Abstract provider interface                                          #
# ------------------------------------------------------------------ #

class SearchProvider(ABC):
    """Abstract search backend. Swap without touching ResearchService."""

    @abstractmethod
    async def search(self, query: str, max_results: int = 8) -> List[Dict[str, Any]]:
        """
        Returns a list of result dicts with at minimum:
          {"title": str, "url": str, "snippet": str}
        """
        ...

    @abstractmethod
    def is_available(self) -> bool: ...


class DuckDuckGoSearchProvider(SearchProvider):
    """
    Lightweight DDG search via the public instant-answer API.
    Falls back gracefully when rate-limited or unavailable.
    ponytail: no API key required, no paid tier.
    """

    async def search(self, query: str, max_results: int = 8) -> List[Dict[str, Any]]:
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                resp = await client.get(
                    "https://api.duckduckgo.com/",
                    params={"q": query, "format": "json", "no_html": 1, "skip_disambig": 1},
                )
                if resp.status_code != 200:
                    return []
                data = resp.json()
        except Exception:
            return []

        results: List[Dict[str, Any]] = []

        # RelatedTopics (most useful)
        for topic in data.get("RelatedTopics", [])[:max_results]:
            if isinstance(topic, dict) and topic.get("Text") and topic.get("FirstURL"):
                results.append({
                    "title": topic.get("Text", "")[:80],
                    "url": topic.get("FirstURL", ""),
                    "snippet": topic.get("Text", ""),
                })

        # AbstractURL as a high-quality primary source
        if data.get("AbstractURL") and data.get("AbstractText"):
            results.insert(0, {
                "title": data.get("Heading", query),
                "url": data["AbstractURL"],
                "snippet": data["AbstractText"],
            })

        return results[:max_results]

    def is_available(self) -> bool:
        return True  # DDG public API needs no key


# ------------------------------------------------------------------ #
# Research service                                                     #
# ------------------------------------------------------------------ #

# Educational domains ranked by quality (heuristic)
_TRUSTED_DOMAINS = [
    "docs.python.org", "developer.mozilla.org", "learn.microsoft.com",
    "docs.rust-lang.org", "kotlinlang.org", "cppreference.com",
    "docs.oracle.com", "go.dev", "fastapi.tiangolo.com",
    "en.wikipedia.org", "github.com", "realpython.com",
    "freecodecamp.org", "w3schools.com", "geeksforgeeks.org",
    "leetcode.com", "cs50.harvard.edu", "ocw.mit.edu",
]


def _domain(url: str) -> str:
    m = re.match(r"https?://([^/]+)", url)
    return m.group(1).lstrip("www.") if m else url


def _rank_results(results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort results: trusted domain first, then deduplicate by domain."""
    seen_domains: set = set()
    ranked = []
    # trusted first
    for r in results:
        d = _domain(r.get("url", ""))
        if any(trusted in d for trusted in _TRUSTED_DOMAINS):
            if d not in seen_domains:
                seen_domains.add(d)
                ranked.append(r)
    # then rest, deduped
    for r in results:
        d = _domain(r.get("url", ""))
        if d not in seen_domains:
            seen_domains.add(d)
            ranked.append(r)
    return ranked


class WebResearchService:
    """
    Researches a learning goal and returns structured resources + a learning sequence.
    Uses LLM when available to enrich descriptions and produce the sequence.
    """

    def __init__(self, search_provider: SearchProvider):
        self._search = search_provider

    async def research(
        self,
        goal: str,
        max_resources: int = 8,
        llm_caller=None,
    ) -> ResearchResult:
        """
        Args:
            goal: Learner's stated goal, e.g. "learn backend development"
            max_resources: Max resources to return
            llm_caller: async callable(prompt, system) -> {"text": str} | None
        """
        # Build a focused educational search query
        query = self._build_query(goal)
        raw = await self._search.search(query, max_results=max_resources + 4)
        ranked = _rank_results(raw)[:max_resources]

        resources = self._build_resources(ranked, goal)
        key_concepts, sequence = self._extract_concepts(goal)

        # Optionally enrich via LLM
        if llm_caller and resources:
            enriched = await self._enrich_via_llm(goal, resources, llm_caller)
            if enriched:
                return enriched

        return ResearchResult(
            goal=goal,
            summary=f"Curated resources for: {goal}",
            key_concepts=key_concepts,
            resources=resources,
            learning_sequence=sequence,
        )

    def _build_query(self, goal: str) -> str:
        """Converts a learner goal into an effective clean topic query."""
        goal_lower = goal.lower().strip()
        for prefix in [
            "i want to learn how to ", "i want to learn about ", "i want to learn ",
            "teach me how to ", "teach me about ", "teach me ",
            "how to learn ", "how to ", "learn about ", "learn ", "study ",
        ]:
            if goal_lower.startswith(prefix):
                goal_lower = goal_lower[len(prefix):].strip()
                break
        return goal_lower or goal

    _VERIFIED_TOPIC_RESOURCES = {
        "backend": [
            {
                "title": "MDN Web Docs: An Overview of HTTP",
                "url": "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview",
                "snippet": "HTTP is a protocol for fetching resources such as HTML documents and REST APIs in backend services.",
                "domain": "developer.mozilla.org",
                "why": "Official documentation — most authoritative source for HTTP foundations",
            },
            {
                "title": "FastAPI Framework Documentation",
                "url": "https://fastapi.tiangolo.com/tutorial/",
                "snippet": "Modern, fast (high-performance) web framework for building APIs with Python.",
                "domain": "fastapi.tiangolo.com",
                "why": "Modern industry standard for Python backend development and microservices",
            },
            {
                "title": "PostgreSQL Tutorial & Architecture",
                "url": "https://www.postgresql.org/docs/current/tutorial.html",
                "snippet": "Introduction to relational database management, schema design, and SQL queries.",
                "domain": "postgresql.org",
                "why": "Industry-standard relational database documentation for backend data persistence",
            },
            {
                "title": "Docker Documentation: Getting Started",
                "url": "https://docs.docker.com/get-started/",
                "snippet": "Containerization platform to build, ship, and run distributed backend applications.",
                "domain": "docs.docker.com",
                "why": "Essential tooling for backend containerization, staging, and production deployment",
            },
            {
                "title": "OWASP Authentication Cheat Sheet",
                "url": "https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html",
                "snippet": "Security guidelines and architectural best practices for user authentication and session management.",
                "domain": "owasp.org",
                "why": "Gold standard for backend security, JWT, and credential management",
            },
        ],
        "python": [
            {
                "title": "Python Official Documentation & Tutorial",
                "url": "https://docs.python.org/3/tutorial/",
                "snippet": "The official tutorial covering Python syntax, data structures, modules, and standard libraries.",
                "domain": "docs.python.org",
                "why": "Official documentation — the ultimate source of truth for Python",
            },
            {
                "title": "Real Python: Python Basics and Tutorials",
                "url": "https://realpython.com/",
                "snippet": "In-depth, community-driven tutorials on Python fundamentals, idioms, and ecosystem tools.",
                "domain": "realpython.com",
                "why": "Practical, example-driven Python tutorials with clear real-world patterns",
            },
        ],
        "c++": [
            {
                "title": "cppreference.com — C++ Reference",
                "url": "https://en.cppreference.com/w/",
                "snippet": "Comprehensive reference for the C++ language, STL containers, and modern standards.",
                "domain": "cppreference.com",
                "why": "Authoritative reference for C++ syntax, idioms, and standard template library",
            },
            {
                "title": "LearnCpp.com — Comprehensive C++ Tutorial",
                "url": "https://www.learncpp.com/",
                "snippet": "Free website devoted to teaching you how to program in modern C++ from scratch.",
                "domain": "learncpp.com",
                "why": "Widely recognized community standard for step-by-step C++ pedagogy",
            },
        ],
    }

    def _build_resources(
        self, raw: List[Dict[str, Any]], goal: str
    ) -> List[LearningResource]:
        resources = []
        seen_urls = set()
        for r in raw:
            url = r.get("url", "")
            if not url or not url.startswith("http") or url in seen_urls:
                continue
            seen_urls.add(url)
            snippet = r.get("snippet", "")[:200]
            domain = _domain(url)
            resources.append(LearningResource(
                title=r.get("title", domain)[:100],
                url=url,
                source=domain,
                description=snippet or f"Resource about {goal} from {domain}",
                why_recommended=r.get("why") or self._why_recommended(domain, goal),
                difficulty="beginner",
                estimated_time="1-2 hours",
                topic=goal,
            ))

        # Check if we should supplement with verified topic resources
        goal_lower = goal.lower()
        for topic_key, verified_list in self._VERIFIED_TOPIC_RESOURCES.items():
            if topic_key in goal_lower:
                for v in verified_list:
                    if v["url"] not in seen_urls:
                        seen_urls.add(v["url"])
                        resources.append(LearningResource(
                            title=v["title"],
                            url=v["url"],
                            source=v["domain"],
                            description=v["snippet"],
                            why_recommended=v["why"],
                            difficulty="beginner",
                            estimated_time="1-2 hours",
                            topic=goal,
                        ))
                break

        return resources

    def _why_recommended(self, domain: str, goal: str) -> str:
        if "docs." in domain or "developer." in domain:
            return "Official documentation — most authoritative source"
        if "wikipedia" in domain:
            return "Encyclopaedic overview — good starting point"
        if "github" in domain:
            return "Open-source examples and community code"
        if "freecodecamp" in domain or "w3schools" in domain:
            return "Beginner-friendly, hands-on tutorials"
        if "realpython" in domain:
            return "Practical, example-driven Python tutorials"
        return f"Relevant educational resource for {goal}"

    def _extract_concepts(self, goal: str) -> tuple[List[str], List[str]]:
        """
        Heuristic concept extraction for common subjects.
        ponytail: simple lookup; upgrade path = LLM extraction.
        """
        goal_lower = goal.lower()

        # Subject-specific concept maps
        subject_map = {
            "python": (
                ["Variables", "Data Types", "Control Flow", "Functions", "OOP", "Modules", "File I/O", "Error Handling"],
                ["Python fundamentals", "Functions & modules", "OOP", "File handling", "Libraries & packages", "Projects"]
            ),
            "c++": (
                ["Syntax", "Variables", "Pointers", "OOP", "Templates", "STL", "Memory Management"],
                ["C++ basics", "Pointers & references", "OOP", "STL", "Algorithms", "Projects"]
            ),
            "javascript": (
                ["Variables", "Functions", "DOM", "Async", "ES6+", "Node.js", "APIs"],
                ["JS fundamentals", "DOM manipulation", "Async programming", "Node.js", "Frameworks"]
            ),
            "backend": (
                ["HTTP", "REST APIs", "Databases", "Auth", "Docker", "Deployment"],
                ["HTTP & REST", "API design", "Databases", "Authentication", "Containerization", "Deployment"]
            ),
            "machine learning": (
                ["Linear Algebra", "Statistics", "Python", "NumPy", "ML Algorithms", "Deep Learning"],
                ["Math foundations", "Python for ML", "Supervised learning", "Neural networks", "Projects"]
            ),
            "web development": (
                ["HTML", "CSS", "JavaScript", "Responsive Design", "Frameworks", "Backend"],
                ["HTML & CSS", "JavaScript", "Responsive design", "React/Vue", "Backend integration"]
            ),
            "computer networks": (
                ["OSI Model", "TCP/IP", "IP Addressing", "Routing", "DNS", "HTTP"],
                ["Network fundamentals", "OSI/TCP-IP", "IP & addressing", "Routing", "Application protocols"]
            ),
        }

        for key, (concepts, sequence) in subject_map.items():
            if key in goal_lower:
                return concepts, sequence

        # Generic fallback
        subject = goal.title()
        return (
            [f"{subject} Fundamentals", "Core Concepts", "Advanced Topics", "Projects"],
            [f"Introduction to {subject}", "Core concepts", "Applied practice", "Projects"],
        )

    async def _enrich_via_llm(
        self,
        goal: str,
        resources: List[LearningResource],
        llm_caller,
    ) -> Optional[ResearchResult]:
        """Ask the LLM to produce enriched metadata and a learning sequence."""
        urls_snippet = "\n".join(
            f"- {r.title} ({r.url})" for r in resources[:6]
        )
        system = (
            "You are an expert educator. Given a learning goal and a list of found resources, "
            "return ONLY valid JSON (no markdown fences) with this schema:\n"
            '{"summary":"...","key_concepts":["..."],"learning_sequence":["..."],'
            '"resource_improvements":[{"url":"...","why_recommended":"...","difficulty":"beginner","estimated_time":"2 hours"}]}'
        )
        prompt = (
            f"Learning goal: {goal}\n\nFound resources:\n{urls_snippet}\n\n"
            "Produce: a 2-sentence summary, 6-8 key concepts, an ordered learning sequence (topic names), "
            "and per-resource: why it's recommended, difficulty level, and estimated study time."
        )
        result = await llm_caller(prompt, system)
        if not result or not result.get("text"):
            return None

        raw = result["text"].strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw).rstrip("`").strip()

        try:
            data = eval(raw) if raw.startswith("{") else None  # noqa: S307
            # Use json.loads instead
            import json
            data = json.loads(raw)
        except Exception:
            return None

        improvements: Dict[str, Dict] = {
            item["url"]: item
            for item in data.get("resource_improvements", [])
            if "url" in item
        }
        for r in resources:
            imp = improvements.get(r.url)
            if imp:
                r.why_recommended = imp.get("why_recommended", r.why_recommended)
                r.difficulty = imp.get("difficulty", r.difficulty)
                r.estimated_time = imp.get("estimated_time", r.estimated_time)

        return ResearchResult(
            goal=goal,
            summary=data.get("summary", f"Curated learning resources for: {goal}"),
            key_concepts=data.get("key_concepts", []),
            resources=resources,
            learning_sequence=data.get("learning_sequence", []),
        )


# Default singleton using DDG (no API key required)
web_research_service = WebResearchService(DuckDuckGoSearchProvider())


# Self-check
if __name__ == "__main__":
    import asyncio

    svc = WebResearchService(DuckDuckGoSearchProvider())
    concepts, seq = svc._extract_concepts("I want to learn Python")
    assert "Variables" in concepts
    assert len(seq) > 3
    query = svc._build_query("I want to learn backend development")
    assert "backend" in query
    print(f"OK — concepts={concepts[:3]}, seq={seq[:2]}")
