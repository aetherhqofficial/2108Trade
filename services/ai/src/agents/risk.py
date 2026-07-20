"""
Risk Agent

Role: Validate every candidate against hard risk limits — a gate, not an advisor.

Primary function: deterministic rule-based checks.
Secondary function: LLM for edge-case reasoning (borderline candidates only).

Deterministic checks implemented:
- Position size validation
- Exposure cap check
- Blocked/allowed asset lists
- Concentration limits
- Daily loss limit check
"""

from __future__ import annotations

import logging
from typing import Any

from ..ollama_client import get_ollama
from ..safeguards import extract_json
from ..state import (
    AgentState,
    ApprovedCandidate,
    RejectedCandidate,
    RiskValidationReport,
    TradeCandidate,
    TradeAction,
)

logger = logging.getLogger(__name__)

import os as _os

_PROMPT_PATH = _os.path.join(_os.path.dirname(__file__), "prompts", "risk.txt")
with open(_PROMPT_PATH) as _f:
    SYSTEM_PROMPT = _f.read().strip()

# Risk limits defaults
DEFAULT_MAX_POSITION_PCT = 0.25  # 25% of portfolio in single position
DEFAULT_MAX_EXPOSURE_PCT = 0.80  # 80% total exposure
DEFAULT_MAX_CONCENTRATION_PCT = 0.40  # 40% in single asset class
DEFAULT_DAILY_LOSS_LIMIT_PCT = 0.05  # 5% daily loss limit
BORDERLINE_THRESHOLD = 0.1  # Within 10% of limit = borderline


def _get_risk_limits(user_profile: dict[str, Any]) -> dict[str, float]:
    """Extract risk limits from user profile with defaults."""
    risk_limits = user_profile.get("risk_limits", {})
    if not isinstance(risk_limits, dict):
        risk_limits = {}
    return {
        "max_position_pct": risk_limits.get("max_position_pct", DEFAULT_MAX_POSITION_PCT),
        "max_exposure_pct": risk_limits.get("max_exposure_pct", DEFAULT_MAX_EXPOSURE_PCT),
        "max_concentration_pct": risk_limits.get(
            "max_concentration_pct", DEFAULT_MAX_CONCENTRATION_PCT
        ),
        "daily_loss_limit_pct": risk_limits.get(
            "daily_loss_limit_pct", DEFAULT_DAILY_LOSS_LIMIT_PCT
        ),
    }


def _get_blocked_assets(user_profile: dict[str, Any]) -> set[str]:
    """Get set of blocked asset symbols."""
    blocked = user_profile.get("blocked_assets", [])
    if isinstance(blocked, list):
        return {str(b).upper() for b in blocked}
    return set()


def _get_allowed_assets(user_profile: dict[str, Any]) -> set[str] | None:
    """Get set of allowed asset symbols. None means all allowed."""
    allowed = user_profile.get("allowed_assets", [])
    if isinstance(allowed, list) and len(allowed) > 0:
        return {str(a).upper() for a in allowed}
    return None


def _deterministic_validate(
    candidate: TradeCandidate,
    user_profile: dict[str, Any],
    portfolio: dict[str, Any],
) -> tuple[bool, str | None, float]:
    """
    Run deterministic risk checks on a single candidate.

    Returns: (is_approved, rejection_reason_or_None, risk_score)
    """
    limits = _get_risk_limits(user_profile)
    blocked = _get_blocked_assets(user_profile)
    allowed = _get_allowed_assets(user_profile)
    symbol = candidate.symbol.upper()

    # 1. Blocked asset check
    if symbol in blocked:
        return False, f"{candidate.symbol} is on the blocked assets list", 1.0

    # 2. Allowed asset check (whitelist)
    if allowed is not None and symbol not in allowed:
        return False, f"{candidate.symbol} is not on the allowed assets list", 1.0

    # 3. Action-specific checks (position sizing from portfolio data)
    if candidate.action == TradeAction.BUY:
        portfolio_value = portfolio.get("total_value", 0)
        current_position = portfolio.get("positions", {}).get(symbol, {}).get("value", 0)

        if portfolio_value > 0:
            current_pct = current_position / portfolio_value

            if current_pct > limits["max_position_pct"]:
                return (
                    False,
                    f"Position in {candidate.symbol} is already at {current_pct:.1%} — "
                    f"exceeds max {limits['max_position_pct']:.1%}",
                    min(current_pct / limits["max_position_pct"], 1.0),
                )

            # Check total exposure
            total_exposure = portfolio.get("total_exposure", 0)
            exposure_pct = total_exposure / portfolio_value
            if exposure_pct > limits["max_exposure_pct"]:
                return (
                    False,
                    f"Total portfolio exposure is {exposure_pct:.1%} — "
                    f"exceeds max {limits['max_exposure_pct']:.1%}",
                    min(exposure_pct / limits["max_exposure_pct"], 1.0),
                )

    # 4. Concentration check
    positions = portfolio.get("positions", {})
    if isinstance(positions, dict):
        asset_class = positions.get(symbol, {}).get("asset_class", "unknown")
        class_value = sum(
            p.get("value", 0) for p in positions.values()
            if p.get("asset_class") == asset_class
        )
        portfolio_value = portfolio.get("total_value", 0)
        if portfolio_value > 0 and class_value / portfolio_value > limits["max_concentration_pct"]:
            return (
                False,
                f"Asset class '{asset_class}' concentration exceeds "
                f"{limits['max_concentration_pct']:.1%}",
                class_value / portfolio_value / limits["max_concentration_pct"],
            )

    # 5. Compute risk score based on how close to limits
    risk_score = _compute_risk_score(candidate, user_profile, portfolio)
    is_risky = risk_score > 0.8

    if is_risky:
        return (
            False,
            f"Risk score {risk_score:.2f} exceeds maximum threshold (0.80)",
            risk_score,
        )

    return True, None, risk_score


def _compute_risk_score(
    candidate: TradeCandidate,
    user_profile: dict[str, Any],
    portfolio: dict[str, Any],
) -> float:
    """
    Compute a risk score for a candidate based on multiple factors.

    Returns 0.0 (safest) to 1.0 (riskiest).
    """
    score = 0.0
    limits = _get_risk_limits(user_profile)

    # Confidence inversion: lower confidence → higher risk
    score += (1.0 - candidate.confidence) * 0.4

    # Time horizon risk: shorter term = riskier
    horizon_map = {"short_term": 0.3, "medium_term": 0.15, "long_term": 0.05}
    score += horizon_map.get(candidate.time_horizon, 0.2)

    # Portfolio concentration factor
    positions = portfolio.get("positions", {})
    portfolio_value = portfolio.get("total_value", 0)
    if portfolio_value > 0 and candidate.symbol in positions:
        current_pct = positions[candidate.symbol].get("value", 0) / portfolio_value
        score += (current_pct / limits["max_position_pct"]) * 0.3

    return min(score, 1.0)


def _is_borderline(risk_score: float) -> bool:
    """Check if a risk score is borderline (close to the threshold)."""
    return 0.65 <= risk_score <= 0.85


async def _llm_edge_case_review(
    candidate: TradeCandidate,
    risk_score: float,
    user_profile: dict[str, Any],
) -> tuple[bool, str]:
    """
    Use LLM for edge-case reasoning on borderline candidates.

    Returns: (is_approved, reasoning)
    """
    ollama = get_ollama()
    available = await ollama.is_available()

    if not available:
        # No LLM available — apply conservative default (reject borderline)
        return False, (
            f"Borderline risk score ({risk_score:.2f}) — "
            "LLM unavailable for edge-case review. Rejected by default."
        )

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"## Edge Case Review\n\n"
                f"A trade candidate has a borderline risk score that requires review.\n\n"
                f"**Candidate:** {candidate.symbol} — {candidate.action.value}\n"
                f"**Risk Score:** {risk_score:.2f}/1.0 (borderline: 0.65-0.85)\n"
                f"**Rationale:** {candidate.rationale}\n"
                f"**Supporting Evidence:** {', '.join(candidate.supporting_evidence)}\n"
                f"**User Risk Tolerance:** {user_profile.get('risk_tolerance', 'moderate')}\n\n"
                f"Should this candidate be APPROVED or REJECTED? "
                f"Respond with a JSON object: "
                f'{{"decision": "approve"|"reject", "reasoning": "..."}}'
            ),
        },
    ]

    try:
        response = await ollama.chat(messages, temperature=0.1, max_tokens=512)
        data = extract_json(response["content"])
        if data and isinstance(data, dict):
            decision = data.get("decision", "reject")
            reasoning = data.get("reasoning", "No reasoning provided by LLM")
            return decision == "approve", reasoning
        # Conservative default
        return False, "LLM response could not be parsed — rejected by default."
    except Exception as e:
        logger.warning(f"[Risk] Edge-case LLM review failed: {e}")
        return False, f"LLM review failed: {e} — rejected by default."


async def risk_agent(state: AgentState) -> dict:
    """
    Risk Agent node.

    Primary: deterministic rule-based checks.
    Secondary: LLM for borderline edge-case reasoning.

    Inputs: TradeCandidates, UserProfile, PortfolioSnapshot, RiskLimits
    Outputs: RiskValidationReport (approved + rejected with reasons)
    """
    candidates: list[TradeCandidate] = state.get("candidates", [])
    user_profile: dict[str, Any] = state.get("user_profile", {})
    # Portfolio snapshot — optional, may come from broker integration later
    portfolio: dict[str, Any] = state.get("portfolio", {})  # type: ignore[typeddict-item]

    logger.info(f"[Risk] Validating {len(candidates)} candidates")

    approved: list[ApprovedCandidate] = []
    rejected: list[RejectedCandidate] = []

    for c in candidates:
        # 1. Run deterministic checks
        is_ok, reason, risk_score = _deterministic_validate(c, user_profile, portfolio)

        # 2. If deterministic checks pass but risk is borderline, use LLM review
        if is_ok and _is_borderline(risk_score):
            logger.info(f"[Risk] Borderline candidate {c.symbol} (score={risk_score:.2f}) — LLM review")
            llm_approved, llm_reason = await _llm_edge_case_review(c, risk_score, user_profile)

            if llm_approved:
                approved.append(ApprovedCandidate(candidate=c, risk_score=risk_score))
                logger.info(f"[Risk] LLM approved borderline candidate: {c.symbol}")
            else:
                rejected.append(RejectedCandidate(
                    candidate=c,
                    reason=f"Borderline risk ({risk_score:.2f}): {llm_reason}",
                ))
                logger.info(f"[Risk] LLM rejected borderline candidate: {c.symbol}")
        elif is_ok:
            approved.append(ApprovedCandidate(candidate=c, risk_score=risk_score))
        else:
            rejected.append(RejectedCandidate(
                candidate=c,
                reason=reason or "Failed risk validation (no specific reason)",
            ))
            logger.info(f"[Risk] Rejected: {c.symbol} — {reason}")

    report = RiskValidationReport(approved=approved, rejected=rejected)

    logger.info(f"[Risk] Complete: {len(approved)} approved, {len(rejected)} rejected")

    return {"risk_report": report}
