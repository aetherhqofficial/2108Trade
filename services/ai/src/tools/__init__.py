"""
Tool-calling foundation for the 2108Trade AI pipeline.

Provides market data and technical indicator functions callable by AI agents
for real data computation alongside LLM-synthesized analysis.
"""

from .indicators import calculate_macd, calculate_rsi, calculate_sma
from .market_data import get_current_price

__all__ = [
    "get_current_price",
    "calculate_sma",
    "calculate_rsi",
    "calculate_macd",
]
