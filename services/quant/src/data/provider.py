"""Data pipeline — abstract data source and common types."""

from __future__ import annotations

import hashlib
import uuid
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Optional

import pandas as pd


class TimeFrame(str, Enum):
    """Supported OHLCV timeframes."""
    M1 = "1m"
    M5 = "5m"
    M15 = "15m"
    M30 = "30m"
    H1 = "1h"
    H4 = "4h"
    D1 = "1d"
    W1 = "1w"


class SignalAction(str, Enum):
    BUY = "BUY"
    SELL = "SELL"
    HOLD = "HOLD"


@dataclass
class Signal:
    """A trade signal from a strategy."""
    signal_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    strategy_id: str = ""
    symbol: str = ""
    timeframe: TimeFrame = TimeFrame.D1
    action: SignalAction = SignalAction.HOLD
    strength: float = 0.0  # -1.0 to 1.0
    confidence: float = 0.0  # 0.0 to 1.0
    price: float = 0.0
    timestamp: datetime = field(default_factory=datetime.utcnow)
    explanation: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "signal_id": self.signal_id,
            "strategy_id": self.strategy_id,
            "symbol": self.symbol,
            "timeframe": self.timeframe.value,
            "action": self.action.value,
            "strength": self.strength,
            "confidence": self.confidence,
            "price": self.price,
            "timestamp": self.timestamp.isoformat(),
            "explanation": self.explanation,
        }


@dataclass
class DataQualityReport:
    """Result of data quality validation."""
    symbol: str
    timeframe: str
    total_rows: int
    missing_rows: int = 0
    gaps_detected: int = 0
    outliers_detected: int = 0
    quality_score: float = 1.0  # 0.0 to 1.0
    issues: list[str] = field(default_factory=list)

    @property
    def is_clean(self) -> bool:
        return self.quality_score >= 0.95 and len(self.issues) == 0


class DataSource(ABC):
    """Abstract base class for all data sources.

    Implements the Template Method pattern: subclasses provide
    _fetch_raw, and this class handles caching and validation.
    """

    def __init__(self, cache_dir: str = "./data"):
        self.cache_dir = cache_dir

    @abstractmethod
    def _fetch_raw(
        self,
        symbol: str,
        timeframe: TimeFrame,
        since: Optional[datetime] = None,
        limit: int = 500,
    ) -> pd.DataFrame:
        """Fetch raw OHLCV data from the source. Must be implemented."""
        ...

    @abstractmethod
    def name(self) -> str:
        """Human-readable source name."""
        ...

    def _cache_path(self, symbol: str, timeframe: TimeFrame) -> str:
        """Generate a deterministic cache file path."""
        key = f"{self.name()}_{symbol}_{timeframe.value}"
        h = hashlib.sha256(key.encode()).hexdigest()[:16]
        return f"{self.cache_dir}/{h}.parquet"

    def fetch(
        self,
        symbol: str,
        timeframe: TimeFrame = TimeFrame.D1,
        since: Optional[datetime] = None,
        limit: int = 500,
        use_cache: bool = True,
    ) -> pd.DataFrame:
        """Fetch OHLCV data with Parquet caching.

        Returns a DataFrame with columns:
        timestamp, open, high, low, close, volume
        """
        import os

        cache_path = self._cache_path(symbol, timeframe)

        if use_cache and os.path.exists(cache_path):
            import pandas as pd
            cached = pd.read_parquet(cache_path)
            if not cached.empty:
                return cached

        df = self._fetch_raw(symbol, timeframe, since=since, limit=limit)

        if df is not None and not df.empty:
            os.makedirs(self.cache_dir, exist_ok=True)
            df.to_parquet(cache_path, index=False)

        return df
