"""
Risk Agent (stub — Phase 1)

Role: Validate every candidate against hard risk limits — a gate, not an advisor.
In Phase 1, approves all candidates (stub). Phase 2 will enforce real risk rules.
"""

from __future__ import annotations

import logging

from ..state import (
    AgentState,
    ApprovedCandidate,
    RejectedCandidate,
    RiskValidationReport,
    TradeCandidate,
)

logger = logging.getLogger(__name__)

import os as _os
_PROMPT_PATH = _os.path.join(_os.path.dirname(__file__), "prompts", "risk.txt")
with open(_PROMPT_PATH) as _f:
    SYSTEM_PROMPT = _f.read().strip()


async def risk_agent(state: AgentState) -> dict:
    """
    Risk Agent node.

    Inputs: TradeCandidates, UserProfile, PortfolioSnapshot, RiskLimits
    Outputs: RiskValidationReport (approved + rejected with reasons)

    Phase 1 (stub): approves all candidates with a mock risk score.
    Phase 2: deterministic rule-based checks:
        - Single-trade risk
        - Daily loss limit
        - Exposure cap
        - Correlation check
        - Blocked/allowed lists
        - Concentration limits
    """
    candidates: list[TradeCandidate] = state.get("candidates", [])
    logger.info(f"[Risk] Validating {len(candidates)} candidates")

    # ── Stub: approve all candidates ────────────────────────────────────
    approved: list[ApprovedCandidate] = []
    rejected: list[RejectedCandidate] = []

    for c in candidates:
        # Phase 2: real risk validation goes here
        approved.append(ApprovedCandidate(
            candidate=c,
            risk_score=0.5,  # neutral risk score
        ))

    report = RiskValidationReport(approved=approved, rejected=rejected)

    logger.info(f"[Risk] Complete: {len(approved)} approved, {len(rejected)} rejected")

    return {
        "risk_report": report,
    }
