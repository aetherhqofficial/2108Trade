"""Dual Moving Average Crossover Strategy (Strategy 1).

A classic trend-following strategy using two SMAs.
BUY when fast SMA crosses above slow SMA (golden cross).
SELL when fast SMA crosses below slow SMA (death cross).
Volume confirmation acts as an additional filter.
"""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass

import pandas as pd

from ...indicators.trend import sma_series
from ..base import (
    RiskLevel,
    Strategy,
    StrategyMetadata,
    StrategyStatus,
    signal_dataframe_template,
)

logger = logging.getLogger(__name__)


@dataclass
class DualMACrossParams:
    """Parameters for the Dual MA Crossover strategy."""
    fast_period: int = 20
    slow_period: int = 50
    volume_confirm: bool = True  # Require volume above average for confirmation
    volume_ma_period: int = 20


class DualMACrossover(Strategy):
    """Dual SMA crossover strategy with optional volume confirmation.

    Strategy logic:
    - Compute fast SMA and slow SMA on close price
    - BUY signal: fast SMA crosses ABOVE slow SMA (and volume > avg if enabled)
    - SELL signal: fast SMA crosses BELOW slow SMA

    Cross detection uses: previous bar fast < slow AND current bar fast >= slow (for BUY).
    """

    metadata = StrategyMetadata(
        strategy_id="dual_ma_cross",
        name="Dual Moving Average Crossover",
        version="0.1.0",
        status=StrategyStatus.RESEARCH,
        description=(
            "Classic trend-following strategy using two Simple Moving Averages. "
            "Generates BUY signals when the fast SMA crosses above the slow SMA "
            "(golden cross) and SELL signals when it crosses below (death cross). "
            "Optional volume confirmation filters weak signals."
        ),
        rationale=(
            "Moving average crossovers are one of the oldest and most studied "
            "trend-following techniques. They work well in trending markets "
            "and are simple enough to be fully explainable. "
            "This serves as the baseline strategy against which more complex "
            "strategies will be benchmarked."
        ),
        asset_classes=["crypto"],
        timeframes=["1h", "4h", "1d"],
        risk_level=RiskLevel.MEDIUM,
        parameters={
            "fast_period": 20,
            "slow_period": 50,
            "volume_confirm": True,
            "volume_ma_period": 20,
        },
    )

    def __init__(
        self,
        fast_period: int = 20,
        slow_period: int = 50,
        volume_confirm: bool = True,
        volume_ma_period: int = 20,
    ):
        self.params = DualMACrossParams(
            fast_period=fast_period,
            slow_period=slow_period,
            volume_confirm=volume_confirm,
            volume_ma_period=volume_ma_period,
        )

    def validate_params(self) -> list[str]:
        errors: list[str] = []
        if self.params.fast_period < 2:
            errors.append("fast_period must be >= 2")
        if self.params.slow_period < 2:
            errors.append("slow_period must be >= 2")
        if self.params.fast_period >= self.params.slow_period:
            errors.append("fast_period must be less than slow_period")
        if self.params.volume_ma_period < 2:
            errors.append("volume_ma_period must be >= 2")
        return errors

    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """Generate BUY/SELL signals from OHLCV data.

        Returns a DataFrame with all original columns plus:
        - SMA_fast, SMA_slow: the moving averages
        - volume_sma: average volume (if volume_confirm)
        - action: BUY, SELL, or HOLD
        - strength: signal strength (-1.0 to 1.0)
        - confidence: estimated confidence (0.0 to 1.0)
        """
        errors = self.validate_params()
        if errors:
            raise ValueError(f"Invalid parameters: {errors}")

        df = data.copy()

        # Compute SMAs
        df["SMA_fast"] = sma_series(df["close"], self.params.fast_period)
        df["SMA_slow"] = sma_series(df["close"], self.params.slow_period)

        # Init signal columns
        df["action"] = "HOLD"
        df["strength"] = 0.0
        df["confidence"] = 0.0

        # Volume confirmation
        if self.params.volume_confirm:
            df["volume_sma"] = sma_series(df["volume"], self.params.volume_ma_period)
            volume_above_avg = df["volume"] > df["volume_sma"]
        else:
            volume_above_avg = pd.Series(True, index=df.index)

        # Detect crossovers
        # Previous bar: fast < slow
        prev_fast_below = df["SMA_fast"].shift(1) < df["SMA_slow"].shift(1)
        # Current bar: fast >= slow (cross above)
        curr_fast_above = df["SMA_fast"] >= df["SMA_slow"]
        # Cross above = BUY
        cross_above = prev_fast_below & curr_fast_above

        # Previous bar: fast > slow
        prev_fast_above = df["SMA_fast"].shift(1) > df["SMA_slow"].shift(1)
        # Current bar: fast <= slow (cross below)
        curr_fast_below = df["SMA_fast"] <= df["SMA_slow"]
        # Cross below = SELL
        cross_below = prev_fast_above & curr_fast_below

        # Apply volume confirmation
        buy_signals = cross_above & volume_above_avg
        sell_signals = cross_below & volume_above_avg

        df.loc[buy_signals, "action"] = "BUY"
        df.loc[sell_signals, "action"] = "SELL"

        # Compute signal strength: normalized distance between SMAs
        sma_diff = df["SMA_fast"] - df["SMA_slow"]
        max_diff = sma_diff.abs().max()
        if max_diff and max_diff > 0:
            df["strength"] = (sma_diff / max_diff).clip(-1.0, 1.0)
            # BUY signals get positive strength, SELL get negative
            df.loc[buy_signals, "strength"] = df.loc[buy_signals, "strength"].abs()
            df.loc[sell_signals, "strength"] = -df.loc[sell_signals, "strength"].abs()

        # Simple confidence: ratio of available data to slow_period + volume bonus
        data_ratio = min(1.0, len(df) / (self.params.slow_period * 2))
        vol_bonus = 0.1 if self.params.volume_confirm else 0.0
        df.loc[buy_signals | sell_signals, "confidence"] = (
            data_ratio * 0.7 + 0.2 + vol_bonus
        )

        signal_count = (buy_signals | sell_signals).sum()
        logger.info(
            f"DualMACross: generated {signal_count} signals from {len(df)} candles "
            f"(BUY={buy_signals.sum()}, SELL={sell_signals.sum()})"
        )

        return df

    def explain_signal(self, data: pd.DataFrame, idx: int) -> dict:
        """Explain the signal at the given index.

        Returns a structured dict for AI explanation consumption.
        """
        if idx < 0 or idx >= len(data):
            return {"error": f"Index {idx} out of range [0, {len(data) - 1}]"}

        row = data.iloc[idx]
        action = row.get("action", "HOLD")

        fast = row.get("SMA_fast", None)
        slow = row.get("SMA_slow", None)
        close = row["close"]
        volume = row["volume"]
        timestamp = row["timestamp"]

        base = {
            "strategy": self.metadata.name,
            "strategy_id": self.metadata.strategy_id,
            "timestamp": str(timestamp),
            "action": str(action),
            "price": round(float(close), 4),
            "SMA_fast": round(float(fast), 4) if fast is not None else None,
            "SMA_slow": round(float(slow), 4) if slow is not None else None,
        }

        if action == "BUY":
            base["interpretation"] = (
                f"BUY signal: the {self.params.fast_period}-period SMA "
                f"({base['SMA_fast']}) has crossed ABOVE the "
                f"{self.params.slow_period}-period SMA ({base['SMA_slow']}). "
                f"This 'golden cross' suggests a bullish trend is beginning. "
                f"Price: {base['price']}."
            )
            if self.params.volume_confirm:
                vol_sma = row.get("volume_sma", None)
                vol_confirm = volume > vol_sma if vol_sma is not None else False
                base["volume_confirmed"] = vol_confirm
                base["volume"] = int(volume)
                base["volume_sma"] = round(float(vol_sma), 2) if vol_sma is not None else None
                base["interpretation"] += (
                    f" Volume {'confirms' if vol_confirm else 'did not confirm'} "
                    f"the signal (vol={int(volume)} vs avg={base['volume_sma']})."
                )

        elif action == "SELL":
            base["interpretation"] = (
                f"SELL signal: the {self.params.fast_period}-period SMA "
                f"({base['SMA_fast']}) has crossed BELOW the "
                f"{self.params.slow_period}-period SMA ({base['SMA_slow']}). "
                f"This 'death cross' suggests a bearish trend is beginning. "
                f"Price: {base['price']}."
            )
            if self.params.volume_confirm:
                vol_sma = row.get("volume_sma", None)
                vol_confirm = volume > vol_sma if vol_sma is not None else False
                base["volume_confirmed"] = vol_confirm
                base["volume"] = int(volume)
                base["volume_sma"] = round(float(vol_sma), 2) if vol_sma is not None else None
                base["interpretation"] += (
                    f" Volume {'confirms' if vol_confirm else 'did not confirm'} "
                    f"the signal (vol={int(volume)} vs avg={base['volume_sma']})."
                )

        else:
            base["interpretation"] = (
                f"HOLD: no crossover detected. Fast SMA ({base['SMA_fast']}) and "
                f"Slow SMA ({base['SMA_slow']}) have not crossed. "
                f"Current price: {base['price']}."
            )

        base["strength"] = round(float(row.get("strength", 0.0)), 4)
        base["confidence"] = round(float(row.get("confidence", 0.0)), 4)

        return base
