"""
Technical indicator calculations — pure Python implementations.

All functions are deterministic, side-effect-free, and require no external
dependencies beyond the Python standard library. Designed to be callable
by AI agents alongside LLM-synthesized analysis.

Formulas are industry-standard:
- SMA: Simple Moving Average (arithmetic mean over a window)
- RSI: Relative Strength Index (Wilder's smoothing method)
- MACD: Moving Average Convergence Divergence (12/26/9 standard)
"""

from __future__ import annotations

from typing import Optional


def calculate_sma(prices: list[float], period: int) -> list[float]:
    """
    Calculate the Simple Moving Average (SMA) for a price series.

    Formula:
        SMA = sum(prices[i-period+1 ... i]) / period

    The first (period - 1) entries in the result will be None/NaN-like (0.0)
    since there aren't enough prior prices to form a full window.

    Args:
        prices: List of closing prices, oldest first.
        period: Number of periods for the moving average window.

    Returns:
        List of SMA values, same length as prices. First (period - 1) values
        are 0.0 (insufficient data).

    Raises:
        ValueError: If period < 1 or period > len(prices).
    """
    if period < 1:
        raise ValueError(f"period must be >= 1, got {period}")
    if period > len(prices):
        raise ValueError(f"period ({period}) cannot exceed number of prices ({len(prices)})")

    result: list[float] = []
    for i in range(len(prices)):
        if i < period - 1:
            result.append(0.0)
        else:
            window = prices[i - period + 1 : i + 1]
            result.append(sum(window) / period)

    return result


def calculate_rsi(prices: list[float], period: int = 14) -> float:
    """
    Calculate the Relative Strength Index (RSI) using Wilder's smoothing.

    Formula:
        RSI = 100 - (100 / (1 + RS))
        where RS = Average Gain / Average Loss over the period

    Uses Wilder's smoothing: first average is simple, subsequent values
    use exponential smoothing:
        AvgGain = (prev_avg_gain * (period - 1) + current_gain) / period

    Args:
        prices: List of closing prices, oldest first.
        period: RSI period (default: 14).

    Returns:
        RSI value between 0.0 and 100.0.

    Raises:
        ValueError: If period < 1 or not enough prices (need at least period + 1).
    """
    if period < 1:
        raise ValueError(f"period must be >= 1, got {period}")
    if len(prices) < period + 1:
        raise ValueError(
            f"Need at least {period + 1} prices for RSI({period}), got {len(prices)}"
        )

    # Calculate price changes
    gains: list[float] = []
    losses: list[float] = []

    for i in range(1, len(prices)):
        delta = prices[i] - prices[i - 1]
        gains.append(max(delta, 0.0))
        losses.append(max(-delta, 0.0))

    # First average (simple)
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    # Wilder's smoothing for remaining periods
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0.0:
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100.0 - (100.0 / (1.0 + rs))
    return round(rsi, 2)


def calculate_macd(
    prices: list[float],
    fast_period: int = 12,
    slow_period: int = 26,
    signal_period: int = 9,
) -> dict[str, list[float]]:
    """
    Calculate the Moving Average Convergence Divergence (MACD) indicator.

    Formula:
        MACD Line = EMA(fast_period) - EMA(slow_period)
        Signal Line = EMA(signal_period) of the MACD Line
        Histogram = MACD Line - Signal Line

    Uses standard 12/26/9 defaults.

    Args:
        prices: List of closing prices, oldest first.
        fast_period: Fast EMA period (default: 12).
        slow_period: Slow EMA period (default: 26).
        signal_period: Signal line EMA period (default: 9).

    Returns:
        Dict with keys:
            "macd_line": list[float] — MACD values
            "signal_line": list[float] — Signal line values
            "histogram": list[float] — MACD - Signal differences
        All lists have the same length as prices. NaN periods are 0.0-filled.

    Raises:
        ValueError: If periods are invalid or insufficient data.
    """
    if len(prices) < slow_period:
        raise ValueError(
            f"Need at least {slow_period} prices for MACD, got {len(prices)}"
        )

    macd_line = _sub_series(
        _calculate_ema(prices, fast_period),
        _calculate_ema(prices, slow_period),
    )

    signal_line = _calculate_ema(macd_line, signal_period)
    histogram = _sub_series(macd_line, signal_line)

    return {
        "macd_line": macd_line,
        "signal_line": signal_line,
        "histogram": histogram,
    }


# ── Internal helpers ──────────────────────────────────────────────────────


def _calculate_ema(prices: list[float], period: int) -> list[float]:
    """
    Calculate Exponential Moving Average (EMA).

    First EMA value is the SMA of the first `period` prices.
    Subsequent values: EMA = price * k + prev_EMA * (1 - k)
    where k = 2 / (period + 1)
    """
    if period < 1:
        raise ValueError(f"period must be >= 1, got {period}")

    multiplier = 2.0 / (period + 1.0)
    result: list[float] = []

    for i in range(len(prices)):
        if i < period - 1:
            result.append(0.0)
        elif i == period - 1:
            # Seed with SMA
            sma = sum(prices[:period]) / period
            result.append(sma)
        else:
            ema = (prices[i] - result[-1]) * multiplier + result[-1]
            result.append(ema)

    return result


def _sub_series(a: list[float], b: list[float]) -> list[float]:
    """Element-wise subtraction: a[i] - b[i]."""
    return [a[i] - b[i] for i in range(len(a))]
