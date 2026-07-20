"""
LangGraph orchestrator for the 2108Trade multi-agent AI pipeline.

Defines the StateGraph with 4 agents running serially:
1. Market Analysis Agent → conditional edge (continue/abort)
2. Strategy Agent
3. Risk Agent
4. Explanation Agent → END

Agents communicate exclusively through AgentState — no direct calls.
Uses MemorySaver for checkpointing (in-memory, per-deployment).
"""

from __future__ import annotations

import logging
import time
from typing import Optional

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from .agents.explanation import explanation_agent
from .agents.market_analysis import market_analysis_agent, should_continue
from .agents.risk import risk_agent
from .agents.strategy import strategy_agent
from .state import AgentState, AnalyzeRequest, AnalyzeResponse, PipelineStatus

logger = logging.getLogger(__name__)


def build_pipeline() -> StateGraph:
    """
    Build and compile the LangGraph StateGraph for the AI pipeline.

    Returns:
        A compiled StateGraph ready for invocation.
    """
    # ── Create the graph ────────────────────────────────────────────────
    workflow = StateGraph(AgentState)

    # ── Add nodes ───────────────────────────────────────────────────────
    workflow.add_node("market_analysis", market_analysis_agent)
    workflow.add_node("strategy", strategy_agent)
    workflow.add_node("risk", risk_agent)
    workflow.add_node("explanation", explanation_agent)

    # ── Define edges ────────────────────────────────────────────────────
    # Entry point: Market Analysis first
    workflow.set_entry_point("market_analysis")

    # Conditional edge after market analysis: continue or abort
    workflow.add_conditional_edges(
        "market_analysis",
        should_continue,
        {
            "continue": "strategy",
            "abort": "explanation",  # Skip to explanation for abort message
        },
    )

    # Linear chain: strategy → risk → explanation → END
    workflow.add_edge("strategy", "risk")
    workflow.add_edge("risk", "explanation")
    workflow.add_edge("explanation", END)

    # ── Compile with checkpointing ──────────────────────────────────────
    checkpointer = MemorySaver()

    compiled = workflow.compile(checkpointer=checkpointer)

    logger.info("Pipeline compiled with in-memory checkpointing")
    return compiled


# ── Singleton pipeline instance ─────────────────────────────────────────

_pipeline: Optional[StateGraph] = None


def get_pipeline() -> StateGraph:
    """Get or create the compiled pipeline singleton."""
    global _pipeline
    if _pipeline is None:
        _pipeline = build_pipeline()
    return _pipeline


# ── Convenience runner ──────────────────────────────────────────────────


async def run_analysis(request: AnalyzeRequest) -> AnalyzeResponse:
    """
    Run the full analysis pipeline for a given request.

    This is the main entry point for the POST /api/v1/analyze endpoint.
    """
    pipeline = get_pipeline()
    start_time = time.monotonic()

    # Build initial state
    initial_state: AgentState = {
        "symbols": request.symbols,
        "timeframe": request.timeframe,
        "data_sources": request.data_sources,
        "user_profile": request.user_profile or {},
        "status": PipelineStatus.IN_PROGRESS,
        "messages": [],
    }

    # Configure thread for checkpointing
    import uuid
    thread_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id}}

    # Run the pipeline
    logger.info(f"Starting pipeline for symbols={request.symbols}, thread={thread_id}")

    final_state = await pipeline.ainvoke(initial_state, config)

    elapsed_ms = (time.monotonic() - start_time) * 1000

    # Extract recommendation
    recommendation = final_state.get("recommendation")
    if recommendation is None:
        from .state import TradeRecommendation
        recommendation = TradeRecommendation(
            reasoning_chain="Pipeline completed but no recommendation was produced.",
            status=PipelineStatus.ERROR,
            confidence=0.0,
        )

    analysis_id = recommendation.id

    from .ollama_client import get_ollama
    ollama = get_ollama()
    model_used = ollama.default_model if await ollama.is_available() else "data-only"

    logger.info(f"Pipeline complete: id={analysis_id}, elapsed={elapsed_ms:.0f}ms, model={model_used}")

    return AnalyzeResponse(
        analysis_id=analysis_id,
        recommendation=recommendation,
        processing_time_ms=round(elapsed_ms, 2),
        model_used=model_used,
    )
