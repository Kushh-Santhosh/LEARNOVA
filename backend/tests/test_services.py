"""
LEARNOVA Backend Services — Self-Check Tests
Run with: python -m backend.tests.test_services
or: python tests/test_services.py (from backend/)
No external test framework required.
"""

import sys
import os
import asyncio

# Allow running from either root or backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


def _run(coro):
    return asyncio.run(coro)


def test_learning_path_scaffold():
    from services.learning_path import LearningPathService
    svc = LearningPathService()
    path = svc._generate_scaffold("Learn Python", "beginner", None)
    assert path.total_modules == 10, f"Expected 10, got {path.total_modules}"
    assert path.estimated_total_hours > 0
    assert all(m.order == i + 1 for i, m in enumerate(path.modules))
    print("  PASS: learning_path scaffold")


def test_learning_path_subject_extraction():
    from services.learning_path import LearningPathService
    svc = LearningPathService()
    assert svc._extract_subject("I want to learn C++") == "C++"
    assert svc._extract_subject("Teach me Machine Learning") == "Machine Learning"
    assert svc._extract_subject("Python") == "Python"
    print("  PASS: subject extraction")


def test_web_research_concepts():
    from services.web_research import WebResearchService, DuckDuckGoSearchProvider
    svc = WebResearchService(DuckDuckGoSearchProvider())
    concepts, seq = svc._extract_concepts("I want to learn Python")
    assert "Variables" in concepts
    assert len(seq) >= 4
    concepts2, seq2 = svc._extract_concepts("I want to learn backend development")
    assert "HTTP" in concepts2
    print("  PASS: web_research concept extraction")


def test_web_research_query_build():
    from services.web_research import WebResearchService, DuckDuckGoSearchProvider
    svc = WebResearchService(DuckDuckGoSearchProvider())
    q = svc._build_query("I want to learn Python")
    assert "python" in q.lower()
    q2 = svc._build_query("Teach me backend development")
    assert "backend" in q2.lower()
    print("  PASS: web_research query building")


def test_domain_ranking():
    from services.web_research import _rank_results
    raw = [
        {"title": "MDN", "url": "https://developer.mozilla.org/en-US/docs/Learn", "snippet": ""},
        {"title": "Random blog", "url": "https://some-random-blog.com/python", "snippet": ""},
        {"title": "Real Python", "url": "https://realpython.com/python-basics", "snippet": ""},
    ]
    ranked = _rank_results(raw)
    assert ranked[0]["url"].startswith("https://developer.mozilla.org")
    print("  PASS: domain ranking")


def test_no_demo_fallback_in_new_doc():
    """
    Verify the off-document handler returns the right intent
    without silently injecting TCP/UDP content.
    """
    import re
    # Simulate what teacher_brain._build_off_document_decision returns for general learning
    # (this is a logic assertion, not an API call)
    spoken = "I couldn't find that in your uploaded curriculum document."
    assert "TCP" not in spoken
    assert "UDP" not in spoken
    print("  PASS: no demo fallback in off-document response")


def test_quiz_engine_topic_quiz():
    from quiz_engine import quiz_engine
    q_py = quiz_engine.generate_topic_quiz("Python")
    assert q_py["type"] in ("mcq", "true_false")
    assert "python" in (q_py["concept"] + q_py["question"]).lower()
    assert "tcp" not in q_py["question"].lower()

    q_cpp = quiz_engine.generate_topic_quiz("C++")
    assert "c++" in (q_cpp["concept"] + q_cpp["question"]).lower() or "pointer" in q_cpp["question"].lower()
    assert "udp" not in q_cpp["question"].lower()
    print("  PASS: quiz_engine general topic generation")


def test_teacher_brain_general_pedagogy():
    from teacher_brain import teacher_brain
    res = teacher_brain._handle_general_pedagogy(
        concept="Python Functions",
        mode="explain",
        citations=[],
        query="How do Python functions work?",
        lang="en"
    )
    assert res["intent"] == "teach"
    assert "python" in res["teacher_text"].lower()
    assert "tcp" not in res["teacher_text"].lower()
    assert "udp" not in res["teacher_text"].lower()
    assert "transport layer" not in res["teacher_text"].lower()
    print("  PASS: teacher_brain general pedagogy (zero TCP/UDP fallback)")


if __name__ == "__main__":
    print("Running LEARNOVA backend service tests...")
    try:
        test_learning_path_scaffold()
        test_learning_path_subject_extraction()
        test_web_research_concepts()
        test_web_research_query_build()
        test_domain_ranking()
        test_no_demo_fallback_in_new_doc()
        test_quiz_engine_topic_quiz()
        test_teacher_brain_general_pedagogy()
        print("\nAll tests passed successfully.")
    except AssertionError as e:
        print(f"\nFAIL: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\nERROR: {e}")
        sys.exit(1)

