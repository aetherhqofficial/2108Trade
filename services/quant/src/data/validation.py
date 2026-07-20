"""Data quality validation — gap detection, outlier detection, scoring."""

from __future__ import annotations

import logging

import numpy as np
import pandas as pd

from ..data.provider import DataQualityReport, TimeFrame

logger = logging.getLogger(__name__)

# Expected interval in minutes for each timeframe
_TIMEFRAME_MINUTES: dict[TimeFrame, float] = {
    TimeFrame.M1: 1,
    TimeFrame.M5: 5,
    TimeFrame.M15: 15,
    TimeFrame.M30: 30,
    TimeFrame.H1: 60,
    TimeFrame.H4: 240,
    TimeFrame.D1: 1440,
    TimeFrame.W1: 10080,
}


def detect_gaps(
    df: pd.DataFrame,
    timeframe: TimeFrame,
    max_gap_multiplier: float = 3.0,
) -> tuple[int, pd.DataFrame]:
    """Detect gaps in time-series OHLCV data.

    Args:
        df: DataFrame with a 'timestamp' column (datetime, UTC).
        timeframe: Expected timeframe between candles.
        max_gap_multiplier: Gaps > this many times the expected interval are flagged.

    Returns:
        Tuple of (gap_count, gap_details DataFrame).
    """
    if df.empty or len(df) < 2:
        return 0, pd.DataFrame()

    expected_minutes = _TIMEFRAME_MINUTES.get(timeframe, 1440)
    max_gap = pd.Timedelta(minutes=expected_minutes * max_gap_multiplier)

    # Compute time deltas between consecutive rows
    deltas = df["timestamp"].diff().iloc[1:]

    # Find gaps larger than max_gap
    gap_mask = deltas > max_gap
    gap_indices = gap_mask[gap_mask].index

    if gap_indices.empty:
        return 0, pd.DataFrame()

    gaps = []
    for idx in gap_indices:
        gaps.append(
            {
                "index": idx,
                "from": df.loc[idx - 1, "timestamp"],
                "to": df.loc[idx, "timestamp"],
                "gap_hours": deltas[idx].total_seconds() / 3600,
            }
        )

    gap_df = pd.DataFrame(gaps)
    logger.warning(f"Detected {len(gap_df)} gaps in data (max_gap={max_gap})")
    return len(gap_df), gap_df


def detect_outliers(
    df: pd.DataFrame,
    zscore_threshold: float = 3.0,
    columns: tuple[str, ...] = ("close", "volume"),
) -> tuple[int, pd.DataFrame]:
    """Detect outliers using z-score method.

    Args:
        df: OHLCV DataFrame.
        zscore_threshold: Z-score above which a value is considered an outlier.
        columns: Columns to check for outliers.

    Returns:
        Tuple of (outlier_count, outlier_details DataFrame).
    """
    outliers = []

    for col in columns:
        if col not in df.columns:
            continue

        values = df[col].dropna()
        if len(values) < 10:
            continue

        mean = values.mean()
        std = values.std()
        if std == 0:
            continue

        z_scores = np.abs((df[col] - mean) / std)
        outlier_mask = z_scores > zscore_threshold

        for idx in df.index[outlier_mask]:
            outliers.append(
                {
                    "index": idx,
                    "timestamp": df.loc[idx, "timestamp"],
                    "column": col,
                    "value": df.loc[idx, col],
                    "z_score": z_scores[idx],
                }
            )

    outlier_df = pd.DataFrame(outliers)
    if not outlier_df.empty:
        logger.warning(f"Detected {len(outlier_df)} outliers (z > {zscore_threshold})")

    return len(outlier_df), outlier_df


def validate_data(
    df: pd.DataFrame,
    symbol: str,
    timeframe: TimeFrame,
) -> DataQualityReport:
    """Run full validation suite on OHLCV data.

    Checks:
    - Required columns present
    - Non-empty
    - Gap detection
    - Outlier detection (close price and volume)
    - Monotonic timestamps
    - Produces a quality score (0.0–1.0)
    """
    issues: list[str] = []
    total_rows = len(df)

    # Required columns
    required = {"timestamp", "open", "high", "low", "close", "volume"}
    missing_cols = required - set(df.columns)
    if missing_cols:
        issues.append(f"Missing columns: {missing_cols}")
        return DataQualityReport(
            symbol=symbol,
            timeframe=timeframe.value,
            total_rows=total_rows,
            quality_score=0.0,
            issues=issues,
        )

    # Empty check
    if df.empty:
        issues.append("DataFrame is empty")
        return DataQualityReport(
            symbol=symbol,
            timeframe=timeframe.value,
            total_rows=0,
            quality_score=0.0,
            issues=issues,
        )

    # Monotonic timestamps
    if not df["timestamp"].is_monotonic_increasing:
        issues.append("Timestamps are not monotonically increasing")

    # Null check
    null_counts = df[list(required)].isnull().sum()
    null_cols = null_counts[null_counts > 0]
    if not null_cols.empty:
        issues.append(f"Null values in columns: {dict(null_cols)}")

    # Gap detection
    gap_count, _ = detect_gaps(df, timeframe)
    if gap_count > 0:
        issues.append(f"Detected {gap_count} time gaps")

    # Outlier detection
    outlier_count_close, _ = detect_outliers(df, columns=("close",))
    outlier_count_vol, _ = detect_outliers(df, columns=("volume",))
    total_outliers = outlier_count_close + outlier_count_vol
    if total_outliers > 0:
        issues.append(f"Detected {total_outliers} outliers (close={outlier_count_close}, volume={outlier_count_vol})")

    # Quality score: deduct for each issue category
    score = 1.0
    if gap_count > 0:
        score -= min(0.2, gap_count * 0.02)
    if total_outliers > 0:
        score -= min(0.2, total_outliers * 0.01)
    if not df["timestamp"].is_monotonic_increasing:
        score -= 0.3
    if not null_cols.empty:
        score -= 0.2
    score = max(0.0, score)

    logger.info(
        f"Data quality for {symbol}/{timeframe.value}: "
        f"score={score:.2f}, rows={total_rows}, gaps={gap_count}, outliers={total_outliers}"
    )

    return DataQualityReport(
        symbol=symbol,
        timeframe=timeframe.value,
        total_rows=total_rows,
        missing_rows=null_counts.sum(),
        gaps_detected=gap_count,
        outliers_detected=total_outliers,
        quality_score=score,
        issues=issues,
    )
