"""
Strategy Agent

Role: Map market assessment to user preferences, generate trade candidates.
Uses LLM for reasoning — matching market conditions to user strategy.

Hallucination safeguards:
- Layer 1: Numbers from Python context, not LLM generation
- Layer 2: Pydantic validation on all candidates
- Layer 3: Prompt requires supporting evidence for every candidate
- Layer 4: Source verification against market assessment citations
"""

from __future__ import annotations

import json
import logging
from typing import Any

from ..ollama_client import get_ollama
from ..safeguards import (
    MAX_RETRIES,
    check_confidence,
    extract_json,
    parse_with_retry,
)
from ..state import (
    AgentState,
    Citation,
    MarketAssessment,
    TradeAction,
    TradeCandidate,
)

logger = logging.getLogger(__name__)

import os as _os

_PROMPT_PATH = _os.path.join(_os.path.dirname(__file__), "prompts", "strategy.txt")
with open(_PROMPT_PATH) as _f:
    SYSTEM_PROMPT = _f.read().strip()

OUTPUT_SCHEMA = """
## Required JSON Output Format
You MUST respond with ONLY a valid JSON array of trade candidates:
[
  {
    "symbol": "TICKER",
    "action": "buy" | "sell" | "hold",
    "rationale": "Clear reasoning tied to specific market conditions and user preferences",
    "confidence": 0.0 to 1.0,
    "supporting_evidence": ["evidence point 1", "evidence point 2", ...],
    "time_horizon": "short_term" | "medium_term" | "long_term"
  }
]

IMPORTANT:
- Every candidate MUST have at least 2 supporting_evidence items
- rationale must reference specific market assessment findings
- confidence must reflect real evidence strength — not optimism
- If no actionable trades are warranted, return HOLD with confidence < 0.5
"""


def _build_strategy_context(state: AgentState) -> str:
    """Build structured context for the Strategy Agent LLM call."""
    assessment: MarketAssessment | None = state.get("market_assessment")
    user_profile: dict[str, Any] = state.get("user_profile", {})
    symbols = state.get("symbols", [])

    parts = ["## Strategy Input Context\n"]

    # Market assessment summary
    if assessment:
        parts.append("### Market Assessment")
        parts.append(f"Sentiment: {assessment.sentiment.value}")
        parts.append(f"Confidence: {assessment.confidence:.2f}")
        parts.append(f"Data Freshness: {assessment.data_freshness.value}")
        parts.append(f"Market Open: {assessment.market_open}")
        parts.append("\nKey Findings:")
        for f in assessment.key_findings:
            parts.append(f"  - {f}")
        parts.append("\nRisk Factors:")
        for r in assessment.risk_factors:
            parts.append(f"  - {r}")
        parts.append("")

    # User profile
    parts.append("### User Profile")
    if user_profile:
        risk_tolerance = user_profile.get("risk_tolerance", "moderate")
        strategy = user_profile.get("strategy", "balanced")
        goals = user_profile.get("goals", ["capital_preservation"])
        parts.append(f"Risk Tolerance: {risk_tolerance}")
        parts.append(f"Strategy Preference: {strategy}")
        parts.append(f"Goals: {', '.join(goals) if isinstance(goals, list) else goals}")
        # Additional profile fields
        for key, value in user_profile.items():
            if key not in ("risk_tolerance", "strategy", "goals"):
                parts.append(f"{key}: {value}")
    else:
        parts.append("Risk Tolerance: moderate (default)")
        parts.append("Strategy: balanced (default)")
        parts.append("Goals: capital_preservation (default)")
    parts.append("")

    # Symbols
    parts.append(f"### Target Symbols: {', '.join(symbols)}")

    return "\n".join(parts)


def _build_fallback_candidates(symbols: list[str]) -> list[TradeCandidate]:
    """Build fallback HOLD candidates when LLM is unavailable."""
    return [
        TradeCandidate(
            symbol=s,
            action=TradeAction.HOLD,
            rationale=(
                f"Data-only analysis for {s}: LLM synthesis unavailable. "
                "Holding pending AI analysis."
            ),
            confidence=0.2,
            supporting_evidence=["LLM unavailable — data-only mode"],
            time_horizon="short_term",
        )
        for s in symbols
    ]


async def strategy_agent(state: AgentState) -> dict:
    """
    Strategy Agent node.

    Uses LLM to map market assessment to user preferences and generate
    trade candidates. Falls back to HOLD candidates if LLM unavailable.

    Inputs: MarketAssessment, UserProfile, PortfolioSnapshot
    Outputs: List[TradeCandidate]
    """
    symbols = state.get("symbols", [])
    logger.info(f"[Strategy] Generating candidates for {symbols}")

    assessment = state.get("market_assessment")
    if assessment is None:
        logger.warning("[Strategy] No market assessment available — generating HOLD only")
        return {"candidates": _build_fallback_candidates(symbols)}

    ollama = get_ollama()
    available = await ollama.is_available()

    if not available:
        logger.warning("[Strategy] Ollama unavailable — using fallback candidates")
        return {"candidates": _build_fallback_candidates(symbols)}

    # Build structured context
    context_text = _build_strategy_context(state)

    full_prompt = SYSTEM_PROMPT + "\n\n" + OUTPUT_SCHEMA

    messages = [
        {"role": "system", "content": full_prompt},
        {
            "role": "user",
            "content": (
                f"Based on the following market and user context, generate trade candidates "
                f"that align with the user's strategy and risk tolerance.\n\n"
                f"{context_text}\n\n"
                f"Respond ONLY with the JSON array as specified in the system prompt."
            ),
        },
    ]

    async def retry_callback(error_context: str) -> str:
        retry_messages = messages + [
            {"role": "assistant", "content": "[Previous response had parse errors]"},
            {"role": "user", "content": error_context},
        ]
        return await ollama.chat_or_none(retry_messages, fallback="[]")

    try:
        llm_response = await ollama.chat(messages, temperature=0.3, max_tokens=2048)
        llm_text = llm_response["content"]
        logger.info(f"[Strategy] LLM response received, length={len(llm_text)}")
    except Exception as e:
        logger.warning(f"[Strategy] LLM call failed: {e}")
        return {"candidates": _build_fallback_candidates(symbols)}

    # Parse the response — it's a list, not a single object
    data = extract_json(llm_text)
    if data is None:
        logger.warning("[Strategy] No valid JSON in LLM response")
        return {"candidates": _build_fallback_candidates(symbols)}

    if not isinstance(data, list):
        # Might be wrapped in an object like {"candidates": [...]}
        if isinstance(data, dict) and "candidates" in data:
            data = data["candidates"]
        elif isinstance(data, dict):
            # Single candidate wrapped as object
            data = [data]
        else:
            logger.warning(f"[Strategy] Unexpected response type: {type(data)}")
            return {"candidates": _build_fallback_candidates(symbols)}

    # Parse each candidate with Pydantic (Layer 2)
    candidates: list[TradeCandidate] = []
    retry_needed = False

    for i, item in enumerate(data):
        if not isinstance(item, dict):
            continue
        try:
            candidate = TradeCandidate.model_validate(item)
            candidates.append(candidate)
        except Exception as e:
            logger.warning(f"[Strategy] Failed to validate candidate {i}: {e}")
            retry_needed = True

    # If some candidates failed, retry once with the full list
    if retry_needed and candidates:
        logger.info("[Strategy] Some candidates failed validation — retrying once")
        try:
            new_text = await retry_callback(
                f"Some candidates in your response failed validation. "
                f"Please ensure every candidate has: symbol, action (buy/sell/hold), "
                f"rationale, confidence (0-1), supporting_evidence (list), and time_horizon. "
                f"Respond ONLY with the corrected JSON array."
            )
            new_data = extract_json(new_text)
            if isinstance(new_data, list):
                candidates = []
                for item in new_data:
                    if isinstance(item, dict):
                        try:
                            candidates.append(TradeCandidate.model_validate(item))
                        except Exception:
                            pass
        except Exception as e:
            logger.warning(f"[Strategy] Retry failed: {e}")

    if not candidates:
        logger.warning("[Strategy] No valid candidates after parsing — falling back")
        return {"candidates": _build_fallback_candidates(symbols)}

    # Confidence floor check on each candidate
    for c in candidates:
        is_confident, warning = check_confidence(c.confidence, context=f"{c.symbol}: ")
        if not is_confident and warning:
            c.supporting_evidence.append(f"⚠️ {warning}")

    logger.info(f"[Strategy] Generated {len(candidates)} candidates")
    return {"candidates": candidates}
