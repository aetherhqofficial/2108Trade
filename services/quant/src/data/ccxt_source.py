"""CCXT data source — exchange-agnostic OHLCV fetching with rate-limit handling."""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Optional

import pandas as pd

from ..data.provider import DataSource, TimeFrame

logger = logging.getLogger(__name__)

# Map our TimeFrame enum to CCXT timeframe strings
_TIMEFRAME_MAP: dict[TimeFrame, str] = {
    TimeFrame.M1: "1m",
    TimeFrame.M5: "5m",
    TimeFrame.M15: "15m",
    TimeFrame.M30: "30m",
    TimeFrame.H1: "1h",
    TimeFrame.H4: "4h",
    TimeFrame.D1: "1d",
    TimeFrame.W1: "1w",
}


class CCXTDataSource(DataSource):
    """Data source using CCXT for exchange-agnostic OHLCV data.

    Supports any exchange CCXT supports. Default: Binance.
    Rate-limit aware: respects exchange limits, backs off on throttling.
    """

    def __init__(
        self,
        exchange_id: str = "binance",
        cache_dir: str = "./data",
        rate_limit_pause: float = 1.0,
    ):
        super().__init__(cache_dir=cache_dir)
        self.exchange_id = exchange_id
        self.rate_limit_pause = rate_limit_pause
        self._exchange = None

    def name(self) -> str:
        return f"ccxt_{self.exchange_id}"

    @property
    def exchange(self):
        """Lazy-init the CCXT exchange instance."""
        if self._exchange is None:
            import ccxt

            exchange_class = getattr(ccxt, self.exchange_id, None)
            if exchange_class is None:
                supported = [
                    e for e in dir(ccxt)
                    if not e.startswith("_") and hasattr(getattr(ccxt, e), "fetch_ohlcv")
                ]
                raise ValueError(
                    f"Exchange '{self.exchange_id}' not found. Supported: {supported}"
                )

            self._exchange = exchange_class(
                {
                    "enableRateLimit": True,
                    "rateLimit": int(self.rate_limit_pause * 1000),
                }
            )
            # Load markets to validate symbols
            try:
                self._exchange.load_markets()
                logger.info(
                    f"CCXT: connected to {self.exchange_id} "
                    f"({len(self._exchange.markets)} markets loaded)"
                )
            except Exception as e:
                logger.warning(f"CCXT: could not load markets for {self.exchange_id}: {e}")

        return self._exchange

    def _fetch_raw(
        self,
        symbol: str,
        timeframe: TimeFrame,
        since: Optional[datetime] = None,
        limit: int = 500,
    ) -> pd.DataFrame:
        """Fetch OHLCV candles via CCXT.

        Returns a DataFrame with columns: timestamp, open, high, low, close, volume
        """
        ccxt_tf = _TIMEFRAME_MAP.get(timeframe, "1d")

        since_ms: Optional[int] = None
        if since is not None:
            since_ms = int(since.timestamp() * 1000)

        try:
            raw = self.exchange.fetch_ohlcv(
                symbol=symbol,
                timeframe=ccxt_tf,
                since=since_ms,
                limit=limit,
            )
        except Exception as e:
            logger.error(f"CCXT fetch_ohlcv failed for {symbol} {timeframe}: {e}")
            raise

        if not raw:
            logger.warning(f"CCXT returned empty data for {symbol} {timeframe}")
            return pd.DataFrame(columns=["timestamp", "open", "high", "low", "close", "volume"])

        df = pd.DataFrame(
            raw,
            columns=["timestamp", "open", "high", "low", "close", "volume"],
        )
        df["timestamp"] = pd.to_datetime(df["timestamp"], unit="ms", utc=True)
        df.sort_values("timestamp", inplace=True)
        df.reset_index(drop=True, inplace=True)

        logger.info(
            f"CCXT: fetched {len(df)} candles for {symbol} {timeframe.value} "
            f"from {self.exchange_id}"
        )
        return df
