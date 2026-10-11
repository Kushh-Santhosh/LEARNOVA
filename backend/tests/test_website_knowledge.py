import pytest
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from services.website_knowledge import (
    validate_and_normalize_url,
    SafeHTMLTextExtractor,
    WebsiteKnowledgeBase,
    website_knowledge_service
)


def test_ssrf_and_url_validation():
    # 1. Localhost targets must be rejected
    is_valid, _, err = validate_and_normalize_url("http://localhost:8000/api")
    assert not is_valid
    assert "localhost" in err.lower() or "loopback" in err.lower()

    is_valid, _, err = validate_and_normalize_url("http://127.0.0.1:3000")
    assert not is_valid

    # 2. Private IP subnets must be rejected
    is_valid, _, err = validate_and_normalize_url("http://192.168.1.1/admin")
    assert not is_valid

    is_valid, _, err = validate_and_normalize_url("http://10.0.0.5")
    assert not is_valid

    is_valid, _, err = validate_and_normalize_url("http://172.16.0.2")
    assert not is_valid

    # 3. Cloud metadata IP must be rejected
    is_valid, _, err = validate_and_normalize_url("http://169.254.169.254/latest/meta-data")
    assert not is_valid
    assert "metadata" in err.lower() or "blocked" in err.lower()

    # 4. Invalid / unsupported schemes must be rejected
    is_valid, _, err = validate_and_normalize_url("ftp://example.com/file")
    assert not is_valid
    assert "protocol" in err.lower() or "scheme" in err.lower()

    is_valid, _, err = validate_and_normalize_url("file:///etc/passwd")
    assert not is_valid

    # 5. Valid public URLs must pass and normalize
    is_valid, norm, err = validate_and_normalize_url("python.org/doc")
    assert is_valid
    assert norm == "https://python.org/doc"


def test_safe_html_text_extractor():
    sample_html = """
    <!DOCTYPE html>
    <html>
      <head>
        <title>FastAPI Documentation - Overview</title>
        <script>alert("malicious script");</script>
        <style>body { background: red; }</style>
      </head>
      <body>
        <nav><a href="/home">Home</a><a href="/login">Login</a></nav>
        <main>
          <h1>Welcome to FastAPI</h1>
          <p>FastAPI is a modern, fast web framework for building APIs with Python.</p>
          <a href="/tutorial/first-steps">Getting Started Tutorial</a>
          <a href="https://external.com/ad">External Ad</a>
        </main>
        <footer>Copyright 2026</footer>
      </body>
    </html>
    """
    extractor = SafeHTMLTextExtractor()
    extractor.feed(sample_html)

    text = extractor.get_extracted_text()
    assert "FastAPI is a modern" in text
    # Scripts, styles, nav, and footer must be excluded
    assert "malicious script" not in text
    assert "background: red" not in text
    assert "Copyright 2026" not in text

    # Extracted links
    assert "/tutorial/first-steps" in extractor.links


def test_website_knowledge_chunking_and_qa():
    kb = WebsiteKnowledgeBase("kb_test_101", "https://fastapi.tiangolo.com")
    kb.add_page_content(
        url="https://fastapi.tiangolo.com/tutorial/",
        title="FastAPI Tutorial - First Steps",
        text="FastAPI provides automatic interactive documentation using Swagger UI and ReDoc. "
             "It uses Pydantic for data validation and Python type hints to declare request parameters. "
             "Dependency Injection is built-in and makes security and database integration clean."
    )

    assert kb.pages_crawled == 1
    assert len(kb.chunks) > 0

    # Search for known concept
    results = kb.search("data validation Pydantic")
    assert len(results) > 0
    assert "Pydantic" in results[0]["content"]

    # Register in service
    website_knowledge_service._stores[kb.kb_id] = kb

    # 1. Grounded Question with sufficient evidence
    grounded_ans = website_knowledge_service.answer_question(
        kb.kb_id,
        "How does FastAPI handle data validation?"
    )
    assert grounded_ans["has_sufficient_evidence"] is True
    assert len(grounded_ans["citations"]) > 0
    assert "Pydantic" in grounded_ans["answer"]

    # 2. Unrelated Question with insufficient evidence
    off_topic_ans = website_knowledge_service.answer_question(
        kb.kb_id,
        "What is the orbital velocity of the International Space Station?"
    )
    assert off_topic_ans["has_sufficient_evidence"] is False
    assert len(off_topic_ans["citations"]) == 0
    assert "sufficient evidence" in off_topic_ans["answer"].lower()
