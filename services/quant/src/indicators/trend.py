"""Trend indicators: SMA, EMA, MACD, ADX."""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Try to import TA-Lib; fall back to pure-pandas implementation
try:
    import talib as ta

    _TALIB_AVAILABLE = True
    logger.info("TA-Lib available — using C-accelerated indicators")
except ImportError:
    _TALIB_AVAILABLE = False
    logger.warning("TA-Lib not available — using pure-pandas fallback indicators")


def sma_series(close: pd.Series, period: int) -> pd.Series:
    """Compute Simple Moving Average."""
    if _TALIB_AVAILABLE:
        result = ta.SMA(close.values, timeperiod=period)
        return pd.Series(result, index=close.index, name=f"SMA_{period}")
    return close.rolling(window=period, min_periods=1).mean()


def ema_series(close: pd.Series, period: int) -> pd.Series:
    """Compute Exponential Moving Average."""
    if _TALIB_AVAILABLE:
        result = ta.EMA(close.values, timeperiod=period)
        return pd.Series(result, index=close.index, name=f"EMA_{period}")
    return close.ewm(span=period, adjust=False).mean()


def macd_series(
    close: pd.Series,
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
) -> pd.DataFrame:
    """Compute MACD (Moving Average Convergence Divergence).

    Returns DataFrame with columns: MACD, MACD_signal, MACD_histogram
    """
    if _TALIB_AVAILABLE:
        macd_val, macd_signal, macd_hist = ta.MACD(
            close.values,
            fastperiod=fast_period,
            slowperiod=slow_period,
            signalperiod=signal_period,
        )
        return pd.DataFrame(
            {
                "MACD": macd_val,
                "MACD_signal": macd_signal,
                "MACD_histogram": macd_hist,
            },
            index=close.index,
        )

    ema_fast = close.ewm(span=fast_period, adjust=False).mean()
    ema_slow = close.ewm(span=slow_period, adjust=False).mean()
    macd_line = ema_fast - ema_slow
    signal_line = macd_line.ewm(span=signal_period, adjust=False).mean()
    histogram = macd_line - signal_line

    return pd.DataFrame(
        {
            "MACD": macd_line,
            "MACD_signal": signal_line,
            "MACD_histogram": histogram,
        },
        index=close.index,
    )


def adx_series(
    high: pd.Series,
    low: pd.Series,
    close: pd.Series,
    period: int = 14,
) -> pd.Series:
    """Compute ADX (Average Directional Index)."""
    if _TALIB_AVAILABLE:
        result = ta.ADX(high.values, low.values, close.values, timeperiod=period)
        return pd.Series(result, index=close.index, name=f"ADX_{period}")

    # Pure-pandas ADX (simplified)
    tr = pd.DataFrame(
        {
            "hl": high - low,
            "hc": (high - close.shift(1)).abs(),
            "lc": (low - close.shift(1)).abs(),
        }
    ).max(axis=1)
    atr = tr.ewm(alpha=1 / period, adjust=False).mean()

    up_move = high - high.shift(1)
    down_move = low.shift(1) - low

    plus_dm = pd.Series(0.0, index=close.index)
    plus_dm[(up_move > down_move) & (up_move > 0)] = up_move
    minus_dm = pd.Series(0.0, index=close.index)
    minus_dm[(down_move > up_move) & (down_move > 0)] = down_move

    plus_di = 100 * (plus_dm.ewm(alpha=1 / period, adjust=False).mean() / atr.replace(0, np.nan))
    minus_di = 100 * (minus_dm.ewm(alpha=1 / period, adjust=False).mean() / atr.replace(0, np.nan))

    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    adx = dx.ewm(alpha=1 / period, adjust=False).mean()
    adx.name = f"ADX_{period}"
    return adx


class SMA:
    """Simple Moving Average indicator with explainability."""

    def __init__(self, period: int = 20):
        self.period = period

    def compute(self, data: pd.DataFrame) -> pd.DataFrame:
        result = data.copy()
        result[f"SMA_{self.period}"] = sma_series(data["close"], self.period)
        return result

    def explain(self, data: pd.DataFrame) -> dict:
        col = f"SMA_{self.period}"
        if col not in data.columns:
            return {"error": f"Column '{col}' not found. Run compute() first."}

        current_price = data["close"].iloc[-1]
        current_sma = data[col].iloc[-1]
        prev_sma = data[col].iloc[-2] if len(data) > 1 else current_sma
        slope = (current_sma - prev_sma) / prev_sma * 100 if prev_sma != 0 else 0

        above = current_price > current_sma
        trend = "upward" if slope > 0.1 else ("downward" if slope < -0.1 else "flat")

        return {
            "indicator": f"SMA({self.period})",
            "current_value": round(float(current_sma), 4),
            "current_price": round(float(current_price), 4),
            "price_above_sma": above,
            "slope_pct": round(float(slope), 4),
            "trend_direction": trend,
            "interpretation": (
                f"Price is {'above' if above else 'below'} the {self.period}-period SMA "
                f"({round(float(current_sma), 2)}), suggesting a "
                f"{'bullish' if above else 'bearish'} bias. SMA slope is {trend} ({slope:.3f}%)."
            ),
        }


class EMA:
    """Exponential Moving Average indicator with explainability."""

    def __init__(self, period: int = 20):
        self.period = period

    def compute(self, data: pd.DataFrame) -> pd.DataFrame:
        result = data.copy()
        result[f"EMA_{self.period}"] = ema_series(data["close"], self.period)
        return result

    def explain(self, data: pd.DataFrame) -> dict:
        col = f"EMA_{self.period}"
        if col not in data.columns:
            return {"error": f"Column '{col}' not found. Run compute() first."}

        current_price = data["close"].iloc[-1]
        current_ema = data[col].iloc[-1]
        prev_ema = data[col].iloc[-2] if len(data) > 1 else current_ema
        slope = (current_ema - prev_ema) / prev_ema * 100 if prev_ema != 0 else 0

        above = current_price > current_ema
        trend = "upward" if slope > 0.1 else ("downward" if slope < -0.1 else "flat")

        return {
            "indicator": f"EMA({self.period})",
            "current_value": round(float(current_ema), 4),
            "current_price": round(float(current_price), 4),
            "price_above_ema": above,
            "slope_pct": round(float(slope), 4),
            "trend_direction": trend,
            "interpretation": (
                f"Price is {'above' if above else 'below'} the {self.period}-period EMA "
                f"({round(float(current_ema), 2)}), suggesting a "
                f"{'bullish' if above else 'bearish'} bias. EMA slope is {trend} ({slope:.3f}%)."
            ),
        }
