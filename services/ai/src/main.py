"""
2108Trade AI Service — FastAPI application.

Multi-agent AI pipeline for explainable trade recommendations.
All endpoints follow the architecture doc v1.0.0-draft.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .bootstrap import bootstrap
from .ollama_client import get_ollama
from .orchestrator import run_analysis
from .state import (
    AnalyzeRequest,
    AnalyzeResponse,
    FeedbackRequest,
    HealthResponse,
    TradeRecommendation,
)

# ── Logging ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("ai-service")

# ── In-memory analysis store (Phase 1 — Phase 2 moves to DB) ───────────

_analysis_store: dict[str, TradeRecommendation] = {}


# ── Lifespan ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("2108Trade AI Service starting up...")

    # Bootstrap: pre-warm Ollama model
    try:
        await bootstrap()
    except Exception as e:
        logger.warning(f"Bootstrap warning (non-fatal): {e}")

    logger.info("AI Service ready.")
    yield

    # Shutdown
    ollama = get_ollama()
    await ollama.close()
    logger.info("AI Service shut down.")


# ── App ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="2108Trade AI Service",
    version="0.1.0",
    description="Multi-agent AI pipeline for explainable trade recommendations.",
    lifespan=lifespan,
)

# CORS: allow platform frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Self-hosted: all origins OK
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ──────────────────────────────────────────────────────────────

@app.get("/api/v1/health", response_model=HealthResponse)
async def health():
    """Service health + Ollama connectivity status."""
    ollama = get_ollama()
    ollama_available = await ollama.is_available()
    models = await ollama.list_models() if ollama_available else []

    model_names = [m.name for m in models]
    model_loaded = ollama.default_model if ollama_available else None

    # Determine status
    if ollama_available and model_loaded in model_names:
        status = "healthy"
    elif ollama_available:
        status = "degraded"
    else:
        status = "degraded"  # Can still operate in data-only mode

    return HealthResponse(
        status=status,
        version="0.1.0",
        ollama_available=ollama_available,
        ollama_models=model_names,
        model_loaded=model_loaded,
    )


# ── Models ──────────────────────────────────────────────────────────────

@app.get("/api/v1/models")
async def list_models():
    """List available Ollama models."""
    ollama = get_ollama()
    models = await ollama.list_models()
    return {
        "models": [m.model_dump() for m in models],
        "default": ollama.default_model,
    }


# ── Analyze ─────────────────────────────────────────────────────────────

@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """
    Run the full 4-agent AI pipeline.

    Agents run serially:
    1. Market Analysis → 2. Strategy → 3. Risk → 4. Explanation

    Returns a TradeRecommendation with full reasoning chain and audit trail.
    """
    logger.info(f"Analyze request: symbols={request.symbols}, timeframe={request.timeframe}")

    try:
        response = await run_analysis(request)

        # Store for retrieval
        rec = response.recommendation
        _analysis_store[rec.id] = rec

        return response

    except Exception as e:
        logger.exception("Pipeline failed")
        raise HTTPException(status_code=500, detail=f"Analysis pipeline failed: {str(e)}")


# ── Analysis retrieval ──────────────────────────────────────────────────

@app.get("/api/v1/analysis/{analysis_id}")
async def get_analysis(analysis_id: str):
    """Retrieve a past analysis by ID."""
    rec = _analysis_store.get(analysis_id)
    if rec is None:
        raise HTTPException(status_code=404, detail="Analysis not found")
    return rec.model_dump()


# ── Feedback ────────────────────────────────────────────────────────────

@app.post("/api/v1/feedback")
async def submit_feedback(feedback: FeedbackRequest):
    """
    Submit user feedback on a trade recommendation.

    Phase 1 (stub): acknowledges and logs feedback.
    Phase 2: stores feedback for prompt refinement and model improvement.
    """
    logger.info(f"Feedback received: analysis_id={feedback.analysis_id}, rating={feedback.rating}")

    # Validate the analysis exists
    if feedback.analysis_id not in _analysis_store:
        raise HTTPException(status_code=404, detail="Analysis not found")

    # Phase 2: store feedback in DB, use for prompt refinement
    return {
        "status": "acknowledged",
        "message": "Feedback received. Analysis refinement pipeline pending (Phase 2).",
    }


# ── Root ────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "2108Trade AI",
        "version": "0.1.0",
        "docs": "/docs",
    }
