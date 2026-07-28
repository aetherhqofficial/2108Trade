"""
Tests for evaluation metrics.
"""

from __future__ import annotations


class TestConfidenceCalibration:
    """Tests for evaluate_confidence_calibration."""

    def test_empty_recommendations(self):
        """Empty list should pass."""
        from src.evaluation.metrics import evaluate_confidence_calibration

        result = evaluate_confidence_calibration([])
        assert result["total"] == 0
        assert result["pass"] is True
        assert result["extreme_count"] == 0

    def test_all_valid_confidence(self):
        """All confidences in range should pass."""
        from src.evaluation.metrics import evaluate_confidence_calibration

        recs = [
            {"confidence": 0.55},
            {"confidence": 0.72},
            {"confidence": 0.85},
            {"confidence": 0.65},
        ]
        result = evaluate_confidence_calibration(recs)
        assert result["total"] == 4
        assert result["pass"] is True
        assert result["extreme_count"] == 0
        assert result["out_of_range_count"] == 0

    def test_extreme_confidence_fails(self):
        """Confidence at 0.0 or 1.0 should fail."""
        from src.evaluation.metrics import evaluate_confidence_calibration

        recs = [
            {"confidence": 0.0},
            {"confidence": 1.0},
            {"confidence": 0.75},
        ]
        result = evaluate_confidence_calibration(recs)
        assert result["pass"] is False
        assert result["extreme_count"] == 2

    def test_out_of_range_confidence_fails(self):
        """Confidence outside [0.5, 0.95] should fail."""
        from src.evaluation.metrics import evaluate_confidence_calibration

        recs = [
            {"confidence": 0.3},
            {"confidence": 0.98},
            {"confidence": 0.75},
        ]
        result = evaluate_confidence_calibration(recs)
        assert result["pass"] is False
        assert result["out_of_range_count"] == 2

    def test_mean_confidence_computed(self):
        """Mean confidence should be correctly calculated."""
        from src.evaluation.metrics import evaluate_confidence_calibration

        recs = [
            {"confidence": 0.5},
            {"confidence": 0.6},
            {"confidence": 0.7},
        ]
        result = evaluate_confidence_calibration(recs)
        assert result["mean_confidence"] == 0.6


class TestExplanationQuality:
    """Tests for evaluate_explanation_quality."""

    def test_empty_explanation(self):
        """Empty explanation should fail."""
        from src.evaluation.metrics import evaluate_explanation_quality

        result = evaluate_explanation_quality("")
        assert result["text_length"] == 0
        assert result["pass"] is False
        assert result["section_score"] == 0.0

    def test_complete_explanation(self):
        """A well-structured explanation should pass."""
        from src.evaluation.metrics import evaluate_explanation_quality

        explanation = """
        ## Summary
        We recommend a balanced approach given current market conditions.

        ## Market Assessment
        The market is showing bullish signals with strong volume. Based on
        data from CoinGecko, BTC is trading above its 50-day moving average.

        ## Strategy Analysis
        Our strategy analysis suggests a conservative position size given
        the elevated volatility. Trade candidates include BTC with a buy
        action at 0.65 confidence.

        ## Risk Validation
        The risk assessment shows manageable exposure at current levels.
        No positions exceed the concentration limit.

        This is an AI-generated analysis for informational purposes only.
        It does not constitute financial advice.
        """
        result = evaluate_explanation_quality(explanation)
        assert result["pass"] is True
        assert result["has_citations"] is True
        assert result["has_disclaimer"] is True
        assert result["section_score"] == 1.0

    def test_missing_sections(self):
        """Explanation missing several sections should score lower."""
        from src.evaluation.metrics import evaluate_explanation_quality

        explanation = "Buy BTC because it looks good."
        result = evaluate_explanation_quality(explanation)
        assert result["section_score"] < 1.0
        assert len(result["sections_missing"]) > 0

    def test_missing_disclaimer(self):
        """Explanation without disclaimer should fail."""
        from src.evaluation.metrics import evaluate_explanation_quality

        explanation = """
        ## Summary
        Buy BTC now.

        ## Market Assessment
        Market looks good based on data.

        ## Strategy Analysis
        BTC should be bought.

        ## Risk Validation
        Risk is acceptable.
        """
        result = evaluate_explanation_quality(explanation)
        assert result["has_disclaimer"] is False
        # Section score should be good but pass fails due to no disclaimer
        assert result["section_score"] >= 0.5
        assert result["pass"] is False


class TestResponseLatency:
    """Tests for evaluate_response_latency."""

    def test_all_agents_fast(self):
        """All agents within thresholds should pass."""
        from src.evaluation.metrics import evaluate_response_latency

        timings = {
            "market_analysis": 5000.0,   # 5s < 30s
            "strategy": 3000.0,          # 3s < 20s
            "risk": 2000.0,              # 2s < 15s
            "explanation": 4000.0,       # 4s < 15s
        }
        result = evaluate_response_latency(timings)
        assert result["all_pass"] is True
        assert result["per_agent"]["market_analysis"]["pass"] is True

    def test_slow_agent_fails(self):
        """An agent exceeding its threshold should fail."""
        from src.evaluation.metrics import evaluate_response_latency

        timings = {
            "market_analysis": 35000.0,  # 35s > 30s
            "strategy": 3000.0,
            "risk": 2000.0,
            "explanation": 4000.0,
        }
        result = evaluate_response_latency(timings)
        assert result["all_pass"] is False
        assert result["per_agent"]["market_analysis"]["pass"] is False

    def test_missing_agents_flagged(self):
        """Missing agents should be noted."""
        from src.evaluation.metrics import evaluate_response_latency

        timings = {
            "market_analysis": 5000.0,
        }
        result = evaluate_response_latency(timings)
        assert result["per_agent"]["strategy"]["pass"] is None
        assert result["per_agent"]["strategy"]["note"] is not None

    def test_total_computed(self):
        """Total should be sum of all timings."""
        from src.evaluation.metrics import evaluate_response_latency

        timings = {
            "market_analysis": 1000.0,
            "strategy": 500.0,
        }
        result = evaluate_response_latency(timings)
        assert result["total_ms"] == 1500.0
