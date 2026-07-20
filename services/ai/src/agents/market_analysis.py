"""
Market Analysis Agent (stub — Phase 1)

Role: Ingest raw market data and produce structured, cited assessments.
In Phase 1, returns mock data. Phase 2 will fetch real market data and use LLM for synthesis.
"""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from ..state import AgentState, Citation, DataFreshness, MarketAssessment, Sentiment, PipelineStatus

logger = logging.getLogger(__name__)

# Load system prompt
import os as _os
_PROMPT_PATH = _os.path.join(_os.path.dirname(__file__), "prompts", "market_analysis.txt")
with open(_PROMPT_PATH) as _f:
    SYSTEM_PROMPT = _f.read().strip()


async def market_analysis_agent(state: AgentState) -> dict:
    """
    Market Analysis Agent node.

    In Phase 1 (stub): returns a mock MarketAssessment.
    Phase 2: fetches real market data, uses RAG for context, synthesizes with LLM.
    """
    symbols = state.get("symbols", [])
    logger.info(f"[MarketAnalysis] Analyzing symbols: {symbols}")

    # ── Stub: mock assessment ───────────────────────────────────────────
    # In Phase 2, this will:
    # 1. Fetch price data, news, sentiment, macro indicators
    # 2. Retrieve relevant context via RAG (ChromaDB)
    # 3. Use LLM to synthesize findings
    # 4. Populate MarketAssessment with structured output

    assessment = MarketAssessment(
        sentiment=Sentiment.NEUTRAL,
        key_findings=[
            f"Stub analysis for {', '.join(symbols)} — real market data integration pending (Phase 2)",
            "Data fetching, RAG context retrieval, and LLM synthesis will be implemented in the next phase",
        ],
        citations=[
            Citation(
                source="Stub — Phase 1",
                timestamp=datetime.now(timezone.utc),
                metric="Phase 1 stub data only",
            ),
        ],
        risk_factors=[
            "Stub data — no real risk factors identified yet",
        ],
        data_freshness=DataFreshness.STALE,
        confidence=0.3,
        market_open=True,
    )

    logger.info(f"[MarketAnalysis] Complete: sentiment={assessment.sentiment}, confidence={assessment.confidence}")

    return {
        "market_assessment": assessment,
    }


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
        logger.info("[MarketAnalysis] Confidence too low — aborting pipeline")
        return "abort"

    return "continue"
