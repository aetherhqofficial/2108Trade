"""
Strategy Agent (stub — Phase 1)

Role: Map market assessment to user preferences, generate trade candidates.
In Phase 1, returns mock candidates. Phase 2 will use LLM reasoning + quantitative signals.
"""

from __future__ import annotations

import logging

from ..state import AgentState, TradeAction, TradeCandidate

logger = logging.getLogger(__name__)

import os as _os
_PROMPT_PATH = _os.path.join(_os.path.dirname(__file__), "prompts", "strategy.txt")
with open(_PROMPT_PATH) as _f:
    SYSTEM_PROMPT = _f.read().strip()


async def strategy_agent(state: AgentState) -> dict:
    """
    Strategy Agent node.

    Inputs: MarketAssessment, UserProfile, PortfolioSnapshot
    Outputs: List[TradeCandidate]

    Phase 1 (stub): generates mock candidates.
    Phase 2: uses LLM to match market conditions to user strategy and size positions.
    """
    symbols = state.get("symbols", [])
    assessment = state.get("market_assessment")
    logger.info(f"[Strategy] Generating candidates for {symbols}")

    # ── Stub: mock candidates ───────────────────────────────────────────
    candidates: list[TradeCandidate] = []

    for symbol in symbols:
        candidates.append(TradeCandidate(
            symbol=symbol,
            action=TradeAction.HOLD,
            rationale=(
                f"Stub candidate for {symbol}: Holding pending real strategy analysis. "
                "Phase 2 will evaluate market conditions, user strategy preferences, "
                "and quantitative signals to generate actionable trade candidates."
            ),
            confidence=0.25,
            supporting_evidence=[
                "Phase 1 stub — no real evidence yet",
                "Quantitative signal integration pending (Phase 2)",
            ],
            time_horizon="short_term",
        ))

    logger.info(f"[Strategy] Generated {len(candidates)} candidates (stub)")

    return {
        "candidates": candidates,
    }
