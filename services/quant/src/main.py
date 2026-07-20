"""
2108Trade Quant Service — FastAPI application.

Quantitative strategy framework: data pipeline, indicator library,
signal generation, and backtesting engine.
"""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .strategies.trend.dual_ma_cross import DualMACrossover
from .data.provider import TimeFrame, Signal, SignalAction
from .data.ccxt_source import CCXTDataSource
from .data.validation import validate_data

# ── Logging ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
)
logger = logging.getLogger("quant-service")

# ── Strategy Registry ────────────────────────────────────────────────────

# Phase 1: single strategy. Phase 2+ loads from config/plugin discovery.
_strategies: dict[str, DualMACrossover] = {}


def _init_strategies():
    """Initialize the strategy registry."""
    strat = DualMACrossover(fast_period=20, slow_period=50, volume_confirm=True)
    _strategies[strat.metadata.strategy_id] = strat
    logger.info(f"Registered strategy: {strat.metadata.strategy_id}")


_init_strategies()

# ── Data Source (singleton) ──────────────────────────────────────────────

_data_source: Optional[CCXTDataSource] = None


def _get_data_source() -> CCXTDataSource:
    global _data_source
    if _data_source is None:
        _data_source = CCXTDataSource(exchange_id="binance", cache_dir="./data")
    return _data_source


# ── In-memory signal store ───────────────────────────────────────────────

_signal_store: list[Signal] = []


# ── Lifespan ────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("2108Trade Quant Service starting up...")
    logger.info(f"{len(_strategies)} strategies registered")
    logger.info("Quant Service ready.")
    yield
    logger.info("Quant Service shut down.")


# ── App ─────────────────────────────────────────────────────────────────

app = FastAPI(
    title="2108Trade Quant Service",
    version="0.1.0",
    description="Quantitative strategy framework for 2108Trade — data pipeline, indicator library, and strategy engine.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Pydantic models ─────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    status: str
    version: str
    strategies_registered: int
    data_source: str


class StrategySummary(BaseModel):
    strategy_id: str
    name: str
    version: str
    status: str
    description: str
    risk_level: str
    asset_classes: list[str]
    timeframes: list[str]
    parameters: dict


class StrategyDetail(StrategySummary):
    rationale: str
    backtest_summary: Optional[dict] = None


class BacktestRequest(BaseModel):
    strategy_id: str = "dual_ma_cross"
    symbol: str = "BTC/USDT"
    timeframe: str = "1d"
    fast_period: int = 20
    slow_period: int = 50
    volume_confirm: bool = True
    limit: int = 500


class BacktestResult(BaseModel):
    strategy_id: str
    symbol: str
    timeframe: str
    total_candles: int
    buy_signals: int
    sell_signals: int
    signals: list[dict]


class SignalResponse(BaseModel):
    signals: list[dict]
    count: int


class DataFetchRequest(BaseModel):
    symbol: str = "BTC/USDT"
    timeframe: str = "1d"
    limit: int = 500


class DataFetchResponse(BaseModel):
    symbol: str
    timeframe: str
    candles: int
    quality_score: float
    issues: list[str]
    latest_close: Optional[float] = None
    latest_timestamp: Optional[str] = None


# ── Health ──────────────────────────────────────────────────────────────

@app.get("/api/quant/health", response_model=HealthResponse)
async def health():
    """Service health check."""
    ds = _get_data_source()
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        strategies_registered=len(_strategies),
        data_source=ds.name(),
    )


# ── Strategies ──────────────────────────────────────────────────────────

@app.get("/api/quant/strategies", response_model=list[StrategySummary])
async def list_strategies():
    """List all registered strategies with metadata."""
    return [
        StrategySummary(**s.metadata.to_dict())
        for s in _strategies.values()
    ]


@app.get("/api/quant/strategies/{strategy_id}", response_model=StrategyDetail)
async def get_strategy(strategy_id: str):
    """Get detailed information about a specific strategy."""
    strategy = _strategies.get(strategy_id)
    if strategy is None:
        raise HTTPException(
            status_code=404,
            detail=f"Strategy '{strategy_id}' not found. Available: {list(_strategies.keys())}",
        )
    return StrategyDetail(**strategy.metadata.to_dict())


# ── Backtest ────────────────────────────────────────────────────────────

@app.post("/api/quant/backtest", response_model=BacktestResult)
async def run_backtest(request: BacktestRequest):
    """Run a backtest for a given strategy on real market data.

    Phase 1: generates signals from live CCXT data (not full backtest simulation).
    Full backtesting with Backtrader/VectorBT is Phase 2.
    """
    strategy = _strategies.get(request.strategy_id)
    if strategy is None:
        raise HTTPException(
            status_code=404,
            detail=f"Strategy '{request.strategy_id}' not found.",
        )

    # Map timeframe string to enum
    try:
        tf = TimeFrame(request.timeframe)
    except ValueError:
        valid = [t.value for t in TimeFrame]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timeframe '{request.timeframe}'. Valid: {valid}",
        )

    # Fetch data
    logger.info(f"Backtest: fetching {request.symbol} {request.timeframe} data...")
    ds = _get_data_source()

    try:
        df = ds.fetch(symbol=request.symbol, timeframe=tf, limit=request.limit)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Data fetch failed: {str(e)}",
        )

    if df.empty:
        raise HTTPException(
            status_code=502,
            detail=f"No data returned for {request.symbol} {request.timeframe}",
        )

    # Validate data quality
    quality = validate_data(df, request.symbol, tf)
    if quality.quality_score < 0.5:
        logger.warning(f"Low data quality for {request.symbol}: {quality.issues}")

    # Override strategy params from request if needed
    original_params = strategy.params
    try:
        strategy.params.fast_period = request.fast_period
        strategy.params.slow_period = request.slow_period
        strategy.params.volume_confirm = request.volume_confirm

        # Generate signals
        result = strategy.generate_signals(df)
    finally:
        strategy.params = original_params  # restore

    # Extract signal rows
    signal_mask = (result["action"] == "BUY") | (result["action"] == "SELL")
    signal_rows = result[signal_mask]

    signals_out = []
    for idx in signal_rows.index:
        row = result.loc[idx]
        explanation = strategy.explain_signal(result, idx)
        signals_out.append(explanation)

        # Store in memory
        sig = Signal(
            strategy_id=strategy.metadata.strategy_id,
            symbol=request.symbol,
            timeframe=tf,
            action=SignalAction(row["action"]),
            strength=float(row.get("strength", 0.0)),
            confidence=float(row.get("confidence", 0.0)),
            price=float(row["close"]),
            timestamp=row["timestamp"],
            explanation=explanation,
        )
        _signal_store.append(sig)

    # Keep only last 1000 signals in memory
    if len(_signal_store) > 1000:
        del _signal_store[:-1000]

    buy_count = int((result["action"] == "BUY").sum())
    sell_count = int((result["action"] == "SELL").sum())

    return BacktestResult(
        strategy_id=request.strategy_id,
        symbol=request.symbol,
        timeframe=request.timeframe,
        total_candles=len(df),
        buy_signals=buy_count,
        sell_signals=sell_count,
        signals=signals_out,
    )


# ── Signals ─────────────────────────────────────────────────────────────

@app.get("/api/quant/signals", response_model=SignalResponse)
async def get_signals(
    strategy_id: Optional[str] = Query(None),
    symbol: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=500),
):
    """Retrieve recent signals, optionally filtered by strategy and symbol."""
    signals = _signal_store

    if strategy_id:
        signals = [s for s in signals if s.strategy_id == strategy_id]
    if symbol:
        signals = [s for s in signals if s.symbol == symbol]

    # Return most recent first
    signals = sorted(signals, key=lambda s: s.timestamp, reverse=True)[:limit]

    return SignalResponse(
        signals=[s.to_dict() for s in signals],
        count=len(signals),
    )


# ── Data ────────────────────────────────────────────────────────────────

@app.post("/api/quant/data/fetch", response_model=DataFetchResponse)
async def fetch_data(request: DataFetchRequest):
    """Fetch OHLCV data and return quality validation results."""
    try:
        tf = TimeFrame(request.timeframe)
    except ValueError:
        valid = [t.value for t in TimeFrame]
        raise HTTPException(
            status_code=400,
            detail=f"Invalid timeframe '{request.timeframe}'. Valid: {valid}",
        )

    ds = _get_data_source()

    try:
        df = ds.fetch(symbol=request.symbol, timeframe=tf, limit=request.limit)
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail=f"Data fetch failed: {str(e)}",
        )

    if df.empty:
        raise HTTPException(
            status_code=502,
            detail=f"No data for {request.symbol} {request.timeframe}",
        )

    quality = validate_data(df, request.symbol, tf)

    return DataFetchResponse(
        symbol=request.symbol,
        timeframe=request.timeframe,
        candles=len(df),
        quality_score=round(quality.quality_score, 4),
        issues=quality.issues,
        latest_close=round(float(df["close"].iloc[-1]), 4),
        latest_timestamp=str(df["timestamp"].iloc[-1]),
    )


# ── Root ────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "2108Trade Quant",
        "version": "0.1.0",
        "docs": "/docs",
        "endpoints": {
            "health": "/api/quant/health",
            "strategies": "/api/quant/strategies",
            "backtest": "/api/quant/backtest",
            "signals": "/api/quant/signals",
            "data_fetch": "/api/quant/data/fetch",
        },
    }
