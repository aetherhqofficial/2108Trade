"""Indicator protocol and base types."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

import pandas as pd


@runtime_checkable
class Indicator(Protocol):
    """Protocol that all indicators must satisfy.

    Every indicator must implement:
    - compute(data) -> DataFrame: compute the indicator values
    - explain(data) -> dict: produce human-readable explanation

    The explain() output feeds directly into the AI explanation engine.
    """

    def compute(self, data: pd.DataFrame) -> pd.DataFrame:
        """Compute indicator values from OHLCV data.

        Args:
            data: DataFrame with at minimum 'close' column (often also 'high', 'low', 'volume').

        Returns:
            DataFrame with indicator columns added/returned.
        """
        ...

    def explain(self, data: pd.DataFrame) -> dict:
        """Generate a human-readable explanation of the indicator's current state.

        Args:
            data: DataFrame with indicator values already computed (via compute()).

        Returns:
            Dict with keys like: indicator_name, current_value, interpretation, signal.
        """
        ...
