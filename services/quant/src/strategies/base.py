"""Strategy protocol and metadata types — per architecture doc section 4."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Protocol, runtime_checkable

import pandas as pd


class StrategyStatus(str, Enum):
    RESEARCH = "research"        # Exploratory, not validated
    PAPER = "paper"              # Paper trading, live data but no real money
    PRODUCTION = "production"    # Live trading
    DEPRECATED = "deprecated"    # Retired


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


@dataclass
class StrategyMetadata:
    """Registry metadata for a strategy."""
    strategy_id: str
    name: str
    version: str = "0.1.0"
    status: StrategyStatus = StrategyStatus.RESEARCH
    description: str = ""
    rationale: str = ""
    asset_classes: list[str] = field(default_factory=lambda: ["crypto"])
    timeframes: list[str] = field(default_factory=lambda: ["1d"])
    risk_level: RiskLevel = RiskLevel.MEDIUM
    parameters: dict = field(default_factory=dict)
    backtest_summary: Optional[dict] = None

    def to_dict(self) -> dict:
        return {
            "strategy_id": self.strategy_id,
            "name": self.name,
            "version": self.version,
            "status": self.status.value,
            "description": self.description,
            "rationale": self.rationale,
            "asset_classes": self.asset_classes,
            "timeframes": self.timeframes,
            "risk_level": self.risk_level.value,
            "parameters": self.parameters,
            "backtest_summary": self.backtest_summary,
        }


@runtime_checkable
class Strategy(Protocol):
    """Protocol that all trading strategies must satisfy.

    Per architecture doc: every strategy has metadata, typed params,
    signal generation, explainability, and validation.
    """

    metadata: StrategyMetadata

    def generate_signals(self, data: pd.DataFrame) -> pd.DataFrame:
        """Generate BUY/SELL/HOLD signals from OHLCV data.

        Args:
            data: DataFrame with columns: timestamp, open, high, low, close, volume

        Returns:
            DataFrame with columns: timestamp, action, strength, confidence,
            plus strategy-specific indicator columns.
        """
        ...

    def explain_signal(self, data: pd.DataFrame, idx: int) -> dict:
        """Explain a signal at a given index.

        Args:
            data: DataFrame with signals already generated.
            idx: Index of the signal to explain.

        Returns:
            Dict with human-readable explanation — feeds AI explanation engine.
        """
        ...

    def validate_params(self) -> list[str]:
        """Validate strategy parameters.

        Returns:
            List of validation error messages (empty = valid).
        """
        ...


def signal_dataframe_template() -> pd.DataFrame:
    """Return an empty signal DataFrame with standard columns."""
    return pd.DataFrame(
        columns=[
            "timestamp",
            "action",
            "strength",
            "confidence",
            "strategy_id",
            "signal_id",
        ]
    )
