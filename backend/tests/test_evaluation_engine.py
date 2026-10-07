"""
LEARNOVA Evaluation Engine Test Suite
Validates:
  - 10-dimension evaluation coverage (Relevance, Accuracy, Completeness, Clarity, Actionability,
    Personalisation, Structure, Level Appropriateness, Human Likeness, Coherence)
  - Objective scoring, reason, evidence, and confidence
  - Multi-iteration statistical consistency (mean, median, standard deviation, range)
"""

import sys
import os
import pytest

# Setup path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from services.evaluation_engine import evaluation_engine, EVALUATION_DIMENSIONS


def test_ten_dimension_evaluation():
    """Verify all 10 dimensions are evaluated with reason, evidence, and confidence."""
    query = "What is the difference between TCP and UDP?"
    response = (
        "In computer networking, TCP and UDP are transport-layer protocols with different design priorities. "
        "First, TCP is connection-oriented and guarantees ordered, reliable packet delivery via three-way handshakes "
        "and acknowledgments. Second, UDP is connectionless and sends datagrams without handshakes, making it significantly "
        "faster for real-time video streaming or online gaming. Remember: choose TCP when correctness is critical, "
        "and choose UDP when low latency matters most."
    )

    eval_result = evaluation_engine.evaluate_response(query, response, learner_level="intermediate")

    assert "overall_score" in eval_result
    assert 7.0 <= eval_result["overall_score"] <= 10.0
    assert len(eval_result["dimension_scores"]) == 10

    for dim in EVALUATION_DIMENSIONS:
        assert dim in eval_result["dimension_scores"]
        dim_data = eval_result["detailed_dimensions"][dim]
        assert "score" in dim_data
        assert "reason" in dim_data
        assert "evidence" in dim_data
        assert "confidence" in dim_data
        assert 0.0 <= dim_data["confidence"] <= 1.0


def test_evaluation_consistency_statistics():
    """Verify repeated evaluation produces mean, median, stdev, range, and stable variance."""
    query = "How do Python dictionaries work?"
    response = (
        "Python dictionaries are hash maps that associate unique keys with values. "
        "When you look up a key, Python computes its hash value to find the corresponding bucket in O(1) average time. "
        "Starting in Python 3.7, dictionaries also preserve insertion order. Try creating a small dict to see how fast key lookups are!"
    )

    stats = evaluation_engine.evaluate_consistency(query, response, iterations=5)

    assert stats["iterations_run"] == 5
    assert "mean" in stats
    assert "median" in stats
    assert "standard_deviation" in stats
    assert "range" in stats
    assert stats["standard_deviation"] < 0.25, f"High variance detected: {stats['standard_deviation']}"
    assert stats["stability_grade"] in ("HIGHLY_STABLE", "STABLE")
    assert len(stats["run_scores"]) == 5
