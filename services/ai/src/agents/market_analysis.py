"""
Market Analysis Agent

Role: Ingest raw market data and produce structured, cited assessments.
Uses LLM (via Ollama) for synthesis; falls back to data-only mode when unavailable.

Hallucination safeguards:
- Layer 1: Numerical data computed by Python, not LLM (via build_market_context_text)
- Layer 2: Pydantic validation on output
- Layer 3: Prompt requires citations
- Layer 4: Post-processing source verification
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Optional

from ..ollama_client import get_ollama
from ..safeguards import (
    MAX_RETRIES,
    build_fallback_assessment,
    build_market_context_text,
    check_confidence,
    extract_json,
    parse_with_retry,
    verify_citations,
)
from ..state import AgentState, Citation, DataFreshness, MarketAssessment, Sentiment

logger = logging.getLogger(__name__)

# Load system prompt
import os as _os

_PROMPT_PATH = _os.path.join(_os.path.dirname(__file__), "prompts", "market_analysis.txt")
with open(_PROMPT_PATH) as _f:
    SYSTEM_PROMPT = _f.read().strip()

# JSON output schema appended to the system prompt
OUTPUT_SCHEMA = """
## Required JSON Output Format
You MUST respond with ONLY a valid JSON object (no markdown, no extra text) matching this schema:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "key_findings": ["finding 1 with data backing", "finding 2 with data backing", ...],
  "citations": [
    {"source": "data source name", "metric": "specific metric cited", "url": null}
  ],
  "risk_factors": ["risk 1", "risk 2", ...],
  "data_freshness": "real_time" | "recent" | "stale" | "unknown",
  "confidence": 0.0 to 1.0,
  "market_open": true | false
}

IMPORTANT: Every key_finding MUST cite a specific data source. Every citation MUST have a source and metric.
If you are uncertain about anything, set a lower confidence and explain in key_findings.
"""


def _build_known_sources(market_data: Optional[dict[str, Any]]) -> set[str]:
    """Extract known data source names from available market data."""
    sources: set[str] = set()
    if market_data:
        for symbol_data in market_data.values():
            if isinstance(symbol_data, dict):
                for key in symbol_data:
                    sources.add(key)
    # Add built-in sources
    sources.add("2108Trade Market Data")
    sources.add("LLM Knowledge (not real-time)")
    return sources


async def market_analysis_agent(state: AgentState) -> dict:
    """
    Market Analysis Agent node.

    Uses LLM to synthesize market data into a structured MarketAssessment.
    Falls back to data-only mode if Ollama is unavailable.

    Inputs: symbols, timeframe, data_sources, optional market_data
    Outputs: MarketAssessment with citations
    """
    symbols = state.get("symbols", [])
    timeframe = state.get("timeframe", "1d")
    data_sources = state.get("data_sources", ["market_data"])
    # Optional: market data can be injected via state for testing / future phases
    market_data: Optional[dict[str, Any]] = state.get("market_data", None)  # type: ignore[typeddict-item]

    logger.info(f"[MarketAnalysis] Analyzing symbols: {symbols}, timeframe={timeframe}")

    ollama = get_ollama()
    available = await ollama.is_available()

    # Build structured market context (Layer 1: Python computes numbers, not LLM)
    context_text = build_market_context_text(symbols, timeframe, data_sources, market_data)

    if not available:
        logger.warning("[MarketAnalysis] Ollama unavailable — using data-only fallback")
        fallback = build_fallback_assessment(symbols, market_data)
        assessment = MarketAssessment.model_validate(fallback)
        return {"market_assessment": assessment}

    # ── Real LLM call ─────────────────────────────────────────────────────
    full_prompt = SYSTEM_PROMPT + "\n\n" + OUTPUT_SCHEMA

    messages = [
        {"role": "system", "content": full_prompt},
        {
            "role": "user",
            "content": (
                f"Analyze the following market context and produce a structured assessment.\n\n"
                f"{context_text}\n\n"
                f"Respond ONLY with the JSON object as specified in the system prompt."
            ),
        },
    ]

    async def retry_callback(error_context: str) -> str:
        """Callback for retry on parse failure."""
        retry_messages = messages + [
            {"role": "assistant", "content": "[Previous response had parse errors]"},
            {"role": "user", "content": error_context},
        ]
        return await ollama.chat_or_none(retry_messages, fallback="{}")

    try:
        llm_response = await ollama.chat(messages, temperature=0.3, max_tokens=2048)
        llm_text = llm_response["content"]
        logger.info(f"[MarketAnalysis] LLM response received, length={len(llm_text)}")
    except Exception as e:
        logger.warning(f"[MarketAnalysis] LLM call failed: {e}")
        fallback = build_fallback_assessment(symbols, market_data, error=str(e))
        assessment = MarketAssessment.model_validate(fallback)
        return {"market_assessment": assessment}

    # Parse with retry (Layer 2: Pydantic validation)
    parsed, error = await parse_with_retry(
        llm_text, MarketAssessment, retry_callback=retry_callback, max_retries=MAX_RETRIES
    )

    if parsed is None:
        logger.warning(f"[MarketAnalysis] Parse failed after retries: {error}")
        fallback = build_fallback_assessment(symbols, market_data, error=error or "Parse failure")
        assessment = MarketAssessment.model_validate(fallback)
        return {"market_assessment": assessment}

    assessment = parsed

    # Layer 4: Source verification
    known_sources = _build_known_sources(market_data)
    verified_citations, citation_warnings = verify_citations(
        list(assessment.citations), known_sources=known_sources
    )
    if citation_warnings:
        logger.warning(f"[MarketAnalysis] Citation warnings: {citation_warnings}")
        # Add warnings to key_findings for transparency
        assessment.key_findings.append(
            f"⚠️ Citation verification note: {len(citation_warnings)} source(s) could not be verified against known data. "
            f"Treat findings with appropriate caution."
        )

    # Confidence floor check
    is_confident, conf_warning = check_confidence(
        assessment.confidence,
        context=f"Symbols: {', '.join(symbols)}. ",
    )
    if not is_confident and conf_warning:
        assessment.key_findings.append(f"⚠️ {conf_warning}")

    # Ensure we have at least basic citations
    if not assessment.citations:
        now = datetime.now(timezone.utc)
        assessment.citations.append(
            Citation(
                source="2108Trade Market Data",
                timestamp=now,
                metric=f"Analysis for {', '.join(symbols)}",
            )
        )

    logger.info(
        f"[MarketAnalysis] Complete: sentiment={assessment.sentiment.value}, "
        f"confidence={assessment.confidence:.2f}, findings={len(assessment.key_findings)}"
    )

    return {"market_assessment": assessment}


def should_continue(state: AgentState) -> str:
    """
    Conditional edge: decide whether to continue the pipeline or abort.

    Aborts if:
    - Market is closed (no trading possible)
    - Market assessment has very low confidence (< 0.1)
    """
    assessment = state.get("market_assessment")

    if assessment is None:
        return "abort"

    if not assessment.market_open:
        logger.info("[MarketAnalysis] Market closed — aborting pipeline")
        return "abort"

    if assessment.confidence < 0.1:
        logger.info("[MarketAnalysis] Confidence too low (<0.1) — aborting pipeline")
        return "abort"

    return "continue"
