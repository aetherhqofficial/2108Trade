"""
Evaluation metrics for the 2108Trade AI pipeline.

Each metric function is self-contained and returns a structured dict
with the metric value, pass/fail status, and diagnostic details.
"""

from __future__ import annotations

from typing import Any


def evaluate_confidence_calibration(recommendations: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Evaluate confidence score calibration across multiple recommendations.

    Checks that confidence scores fall within reasonable bounds (0.5–0.95),
    not at extremes (0.0 or 1.0), which would indicate overconfidence or
    complete uncertainty.

    Args:
        recommendations: List of recommendation dicts, each with a "confidence" key.

    Returns:
        Dict with:
            total: Number of recommendations evaluated
            extreme_count: Number with confidence at 0.0 or 1.0
            out_of_range_count: Number outside [0.5, 0.95]
            mean_confidence: Average confidence across all
            pass: True if no extreme values and all in range
            details: List of per-recommendation assessments
    """
    total = len(recommendations)
    if total == 0:
        return {
            "total": 0,
            "extreme_count": 0,
            "out_of_range_count": 0,
            "mean_confidence": 0.0,
            "pass": True,
            "details": [],
        }

    extreme_count = 0
    out_of_range_count = 0
    confidences: list[float] = []
    details: list[dict[str, Any]] = []

    for i, rec in enumerate(recommendations):
        confidence = rec.get("confidence", 0.0)
        if not isinstance(confidence, (int, float)):
            confidence = 0.0

        confidences.append(float(confidence))

        issues: list[str] = []
        if confidence == 0.0 or confidence == 1.0:
            issues.append("extreme_value")
            extreme_count += 1
        if confidence < 0.5 or confidence > 0.95:
            issues.append("out_of_range")
            out_of_range_count += 1

        details.append({
            "index": i,
            "confidence": confidence,
            "issues": issues,
            "ok": len(issues) == 0,
        })

    mean_confidence = sum(confidences) / total if total > 0 else 0.0

    return {
        "total": total,
        "extreme_count": extreme_count,
        "out_of_range_count": out_of_range_count,
        "mean_confidence": round(mean_confidence, 4),
        "pass": extreme_count == 0 and out_of_range_count == 0,
        "details": details,
    }


def evaluate_explanation_quality(explanation: str) -> dict[str, Any]:
    """
    Evaluate the quality of an AI-generated explanation.

    Checks for required structural elements:
    - Market Assessment section
    - Strategy Analysis section
    - Risk Validation section
    - Summary section
    - At least one citation or source reference
    - Mandatory disclaimer text

    Args:
        explanation: The explanation text to evaluate.

    Returns:
        Dict with:
            text_length: Character count
            sections_found: Which required sections were detected
            has_citations: Whether source references exist
            has_disclaimer: Whether the mandatory disclaimer is present
            section_score: Fraction of required sections found (0.0–1.0)
            pass: True if all checks pass
    """
    required_sections = {
        "Market Assessment": any(
            phrase in explanation.lower()
            for phrase in ["market assessment", "market context", "market conditions"]
        ),
        "Strategy Analysis": any(
            phrase in explanation.lower()
            for phrase in ["strategy analysis", "trade candidates", "strategy"]
        ),
        "Risk Validation": any(
            phrase in explanation.lower()
            for phrase in ["risk validation", "risk assessment", "risk summary"]
        ),
        "Summary": any(
            phrase in explanation.lower()
            for phrase in ["summary", "conclusion", "recommendation"]
        ),
    }

    # Check for citations/source references
    has_citations = any(
        phrase in explanation.lower()
        for phrase in ["source:", "based on", "according to", "data from", "[", "citation"]
    )

    # Check for disclaimer
    has_disclaimer = any(
        phrase in explanation.lower()
        for phrase in [
            "not financial advice",
            "does not constitute financial advice",
            "informational purposes only",
            "consult a qualified financial advisor",
        ]
    )

    sections_found = [k for k, v in required_sections.items() if v]
    section_score = len(sections_found) / len(required_sections) if required_sections else 1.0

    return {
        "text_length": len(explanation),
        "sections_found": sections_found,
        "sections_missing": [k for k, v in required_sections.items() if not v],
        "has_citations": has_citations,
        "has_disclaimer": has_disclaimer,
        "section_score": round(section_score, 2),
        "pass": len(sections_found) >= 2 and has_citations and has_disclaimer,
    }


def evaluate_response_latency(timings: dict[str, float]) -> dict[str, Any]:
    """
    Evaluate per-agent response latency against defined thresholds.

    Thresholds (from architecture doc):
    - Market Analysis: < 30 seconds
    - Strategy: < 20 seconds
    - Risk: < 15 seconds
    - Explanation: < 15 seconds

    Args:
        timings: Dict mapping agent name to latency in milliseconds.

    Returns:
        Dict with:
            per_agent: Dict of agent → {latency_ms, threshold_ms, pass}
            total_ms: Sum of all agent latencies
            all_pass: True if every agent passed its threshold
    """
    thresholds: dict[str, float] = {
        "market_analysis": 30_000.0,  # 30s in ms
        "strategy": 20_000.0,         # 20s in ms
        "risk": 15_000.0,             # 15s in ms
        "explanation": 15_000.0,      # 15s in ms
    }

    per_agent: dict[str, dict[str, Any]] = {}
    all_pass = True

    for agent_name, latency_ms in timings.items():
        threshold_ms = thresholds.get(agent_name, 30_000.0)  # Default 30s
        passed = latency_ms <= threshold_ms
        if not passed:
            all_pass = False

        per_agent[agent_name] = {
            "latency_ms": round(latency_ms, 2),
            "threshold_ms": threshold_ms,
            "pass": passed,
        }

    # Also flag any agents in thresholds that weren't timed
    for agent_name in thresholds:
        if agent_name not in per_agent:
            per_agent[agent_name] = {
                "latency_ms": None,
                "threshold_ms": thresholds[agent_name],
                "pass": None,
                "note": "Agent not present in timings",
            }

    return {
        "per_agent": per_agent,
        "total_ms": round(sum(timings.values()), 2),
        "all_pass": all_pass,
    }
