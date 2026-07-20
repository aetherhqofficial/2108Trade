"""
Evaluation runner — executes test cases through the AI pipeline and collects metrics.

Orchestrates running a set of test cases through the pipeline, collecting
confidence calibration, explanation quality, and latency metrics for each.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from ..state import AnalyzeRequest

from .metrics import (
    evaluate_confidence_calibration,
    evaluate_explanation_quality,
    evaluate_response_latency,
)

logger = logging.getLogger(__name__)


async def run_evaluation(
    pipeline: Any,
    test_cases: list[dict[str, Any]],
) -> dict[str, Any]:
    """
    Run all test cases through the pipeline and aggregate evaluation metrics.

    Args:
        pipeline: A callable that accepts an AnalyzeRequest and returns
                  an AnalyzeResponse. Typically the orchestrator's run_analysis.
        test_cases: List of test case dicts, each with "symbols", "timeframe",
                   "expect_action", and "description".

    Returns:
        Dict with:
            test_count: Number of test cases run
            passed: Number that produced any output (not errored)
            failed: Number that errored
            confidence_calibration: Aggregated confidence metric
            explanation_quality: Aggregated explanation quality metric
            latency: Aggregated latency metric
            per_test: List of per-test-case results
    """
    results: list[dict[str, Any]] = []
    all_recommendations: list[dict[str, Any]] = []
    all_timings: dict[str, list[float]] = {}
    explanations: list[str] = []

    for i, tc in enumerate(test_cases):
        test_start = time.monotonic()
        result: dict[str, Any] = {
            "index": i,
            "description": tc.get("description", ""),
            "symbols": tc.get("symbols", []),
            "expect_action": tc.get("expect_action", "hold"),
            "error": None,
        }

        try:
            request = AnalyzeRequest(
                symbols=tc["symbols"],
                timeframe=tc.get("timeframe", "1d"),
                data_sources=tc.get("data_sources", ["market_data"]),
            )
            response = await pipeline(request)

            rec = response.recommendation
            result["analysis_id"] = rec.id
            result["status"] = rec.status.value
            result["confidence"] = rec.confidence
            result["processing_time_ms"] = response.processing_time_ms

            # Collect per-agent timings if available
            agent_timings = getattr(response, "agent_timings", {})
            if agent_timings:
                result["agent_timings"] = agent_timings
                for name, ms in agent_timings.items():
                    if name not in all_timings:
                        all_timings[name] = []
                    all_timings[name].append(ms)

            # Determine actual action from approved candidates
            candidates = rec.candidates
            if candidates:
                actions = [c.candidate.action.value for c in candidates]
                result["actual_action"] = actions[0] if len(actions) == 1 else "mixed"
            else:
                result["actual_action"] = "none"

            # Store for aggregate metrics
            all_recommendations.append({"confidence": rec.confidence})
            explanations.append(rec.reasoning_chain)

            result["test_elapsed_ms"] = (time.monotonic() - test_start) * 1000

        except Exception as e:
            logger.error(f"Test case {i} failed: {e}")
            result["error"] = str(e)
            result["test_elapsed_ms"] = (time.monotonic() - test_start) * 1000

        results.append(result)

    # ── Aggregate metrics ────────────────────────────────────────────────

    confidence_metric = evaluate_confidence_calibration(all_recommendations)

    # Average per-agent timings
    avg_timings: dict[str, float] = {}
    for name, times in all_timings.items():
        avg_timings[name] = sum(times) / len(times) if times else 0.0

    latency_metric = evaluate_response_latency(avg_timings)

    # Explanation quality (evaluate the first explanation as representative)
    explanation_metric = (
        evaluate_explanation_quality(explanations[0])
        if explanations
        else evaluate_explanation_quality("")
    )

    passed = sum(1 for r in results if r.get("error") is None)
    failed = sum(1 for r in results if r.get("error") is not None)

    return {
        "test_count": len(test_cases),
        "passed": passed,
        "failed": failed,
        "confidence_calibration": confidence_metric,
        "explanation_quality": explanation_metric,
        "latency": latency_metric,
        "per_test": results,
    }
