"""
Explanation Agent (stub — Phase 1)

Role: Translate the full reasoning chain into plain-language explanations.
This is the most LLM-heavy agent. In Phase 1, produces a stub explanation.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..state import (
    AgentState,
    Citation,
    PipelineStatus,
    TradeRecommendation,
)

logger = logging.getLogger(__name__)

import os as _os
_PROMPT_PATH = _os.path.join(_os.path.dirname(__file__), "prompts", "explanation.txt")
with open(_PROMPT_PATH) as _f:
    SYSTEM_PROMPT = _f.read().strip()


async def explanation_agent(state: AgentState) -> dict:
    """
    Explanation Agent node.

    Inputs: Full SharedState (MarketAssessment, candidates, RiskValidationReport)
    Outputs: TradeRecommendation with reasoning chain, citations, risk summary

    Phase 1 (stub): generates a simple mock explanation.
    Phase 2: uses LLM to synthesize full reasoning chain in plain language.
    """
    assessment = state.get("market_assessment")
    candidates = state.get("candidates", [])
    risk_report = state.get("risk_report")

    logger.info("[Explanation] Generating recommendation explanation")

    # ── Build stub explanation ──────────────────────────────────────────
    approved_count = len(risk_report.approved) if risk_report else 0
    rejected_count = len(risk_report.rejected) if risk_report else 0

    symbol_list = state.get("symbols", [])
    symbols_str = ", ".join(symbol_list)

    reasoning = (
        f"# Analysis for {symbols_str}\n\n"
        f"## Market Assessment (Stub)\n"
        f"This is a Phase 1 stub analysis. The market assessment agent "
        f"evaluated {symbols_str} and returned a neutral sentiment with low confidence, "
        f"as real market data integration is not yet implemented.\n\n"
        f"## Strategy Analysis (Stub)\n"
        f"The strategy agent generated {len(candidates)} trade candidates, "
        f"all defaulting to HOLD pending real strategy analysis in Phase 2.\n\n"
        f"## Risk Validation (Stub)\n"
        f"The risk agent reviewed {len(candidates)} candidates: "
        f"{approved_count} approved, {rejected_count} rejected. "
        f"Phase 2 will implement deterministic risk rules including position sizing, "
        f"exposure limits, and correlation checks.\n\n"
        f"## Summary\n"
        f"**Recommendation:** No actionable trades at this time (Phase 1 stub). "
        f"Real AI-powered analysis coming in Phase 2."
    )

    recommendation = TradeRecommendation(
        candidates=risk_report.approved if risk_report else [],
        reasoning_chain=reasoning,
        citations=[
            Citation(
                source="2108Trade AI — Phase 1 Stub",
                timestamp=datetime.now(timezone.utc),
                metric="Stub pipeline — all agents returning mock data",
            ),
        ],
        risk_summary=(
            f"Risk validation (stub): {approved_count} approved, {rejected_count} rejected. "
            "All approvals are mock — no real risk enforcement yet."
        ),
        confidence=0.1,
        status=PipelineStatus.COMPLETED,
    )

    logger.info(f"[Explanation] Complete: {approved_count} approved, {rejected_count} rejected")

    return {
        "recommendation": recommendation,
        "status": PipelineStatus.COMPLETED,
    }
