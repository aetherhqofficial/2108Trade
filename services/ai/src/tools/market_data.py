"""
Market data tool — fetches current price data.

Tries CCXT (Binance) first for live data, falls back to sample data
when exchange access is unavailable. Designed to be callable by AI agents
as part of the tool-calling layer.
"""

from __future__ import annotations

import logging
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ── Sample data for offline/fallback mode ────────────────────────────────

_SAMPLE_PRICES: dict[str, float] = {
    "BTC/USDT": 67250.00,
    "ETH/USDT": 3490.00,
    "SOL/USDT": 185.00,
    "BNB/USDT": 605.00,
    "XRP/USDT": 0.62,
    "ADA/USDT": 0.48,
    "DOGE/USDT": 0.125,
    "AVAX/USDT": 38.50,
    "DOT/USDT": 7.20,
    "MATIC/USDT": 0.72,
}

# Cache: avoid repeated failed exchange calls
_cached_unavailable: bool = False
_cache_timestamp: float = 0.0
_CACHE_TTL: float = 60.0  # 1 minute


async def get_current_price(symbol: str) -> dict[str, Any]:
    """
    Get the current price for a trading symbol.

    Attempts to fetch live data from CCXT (Binance) first.
    Falls back to sample data if the exchange is unreachable.

    Args:
        symbol: Trading pair symbol (e.g., "BTC/USDT", "ETH/USDT").

    Returns:
        Dict with keys:
            symbol: The queried symbol
            price: Current price as float
            timestamp: Unix timestamp of the price
            source: "live" if from exchange, "sample" if fallback
    """
    global _cached_unavailable, _cache_timestamp

    # Try live data first (if not recently known unavailable)
    now = time.time()
    if not _cached_unavailable or (now - _cache_timestamp) > _CACHE_TTL:
        try:
            import ccxt  # type: ignore

            exchange = ccxt.binance({"enableRateLimit": True})
            ticker = exchange.fetch_ticker(symbol)

            _cached_unavailable = False
            return {
                "symbol": symbol,
                "price": float(ticker["last"]),
                "timestamp": ticker.get("timestamp", int(now * 1000)),
                "source": "live",
            }
        except Exception as e:
            logger.warning(f"CCXT fetch failed for {symbol}: {e}")
            _cached_unavailable = True
            _cache_timestamp = now

    # Fallback to sample data
    price = _SAMPLE_PRICES.get(symbol.upper())
    if price is None:
        price = 100.0  # Generic fallback
        logger.warning(f"No sample data for {symbol}, using generic price 100.0")

    return {
        "symbol": symbol,
        "price": price,
        "timestamp": int(now * 1000),
        "source": "sample",
    }
