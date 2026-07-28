"""
Test cases for evaluating the 2108Trade AI pipeline.

Each test case defines input parameters and expected properties
that the pipeline output should satisfy.
"""

from __future__ import annotations

from typing import Any

TEST_CASES: list[dict[str, Any]] = [
    {
        "symbols": ["BTC/USDT"],
        "timeframe": "1h",
        "expect_action": "hold",
        "description": "BTC during low-volatility consolidation — should recommend HOLD",
        "market_conditions": "BTC trading in tight range 67,200-67,300, low volume, no breakout signals",
    },
    {
        "symbols": ["ETH/USDT"],
        "timeframe": "4h",
        "expect_action": "buy",
        "description": "ETH after bullish breakout above resistance — should consider BUY",
        "market_conditions": "ETH breaks above 3,500 resistance on high volume, MACD bullish crossover",
    },
    {
        "symbols": ["SOL/USDT"],
        "timeframe": "1d",
        "expect_action": "sell",
        "description": "SOL after extended downtrend — should consider SELL to cut losses",
        "market_conditions": "SOL down 15% in 3 days, RSI oversold at 22, bear flag forming",
    },
    {
        "symbols": ["BTC/USDT", "ETH/USDT"],
        "timeframe": "1d",
        "expect_action": "buy",
        "description": "Multiple assets with strong buy signals — diversified bullish scenario",
        "market_conditions": "BTC and ETH both above 50-day SMA, positive funding rates, institutional inflows",
    },
    {
        "symbols": ["DOGE/USDT"],
        "timeframe": "15m",
        "expect_action": "hold",
        "description": "Meme coin on very short timeframe — high noise, should HOLD",
        "market_conditions": "DOGE erratic price action, no clear trend, high spread, low confidence signals",
    },
    {
        "symbols": ["ADA/USDT"],
        "timeframe": "1w",
        "expect_action": "hold",
        "description": "Long-term hold assessment for ADA — neutral/bearish long-term trend",
        "market_conditions": "ADA in multi-month downtrend, below 200-day MA, low developer activity",
    },
]
