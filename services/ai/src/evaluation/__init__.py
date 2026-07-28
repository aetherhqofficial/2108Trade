"""
Evaluation framework for the 2108Trade AI pipeline.

Provides metrics, test cases, and a runner to assess pipeline quality
across correctness, explanation quality, and latency dimensions.
"""

from .metrics import (
    evaluate_confidence_calibration,
    evaluate_explanation_quality,
    evaluate_response_latency,
)
from .runner import run_evaluation

__all__ = [
    "evaluate_confidence_calibration",
    "evaluate_explanation_quality",
    "evaluate_response_latency",
    "run_evaluation",
]
