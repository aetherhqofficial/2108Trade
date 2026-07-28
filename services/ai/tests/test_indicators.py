"""
Tests for technical indicator calculations.
"""

from __future__ import annotations


class TestSMA:
    """Tests for calculate_sma."""

    def test_sma_simple(self):
        """SMA with a simple price series and period 3."""
        from src.tools.indicators import calculate_sma

        prices = [1.0, 2.0, 3.0, 4.0, 5.0, 6.0]
        result = calculate_sma(prices, 3)
        assert len(result) == 6
        assert result[0] == 0.0  # Not enough data
        assert result[1] == 0.0  # Not enough data
        assert result[2] == 2.0  # (1+2+3)/3
        assert result[3] == 3.0  # (2+3+4)/3
        assert result[4] == 4.0  # (3+4+5)/3
        assert result[5] == 5.0  # (4+5+6)/3

    def test_sma_period_1(self):
        """SMA with period 1 should return the prices themselves."""
        from src.tools.indicators import calculate_sma

        prices = [10.0, 20.0, 30.0]
        result = calculate_sma(prices, 1)
        assert result == [10.0, 20.0, 30.0]

    def test_sma_full_window(self):
        """SMA with period equal to length returns one valid value."""
        from src.tools.indicators import calculate_sma

        prices = [5.0, 10.0, 15.0]
        result = calculate_sma(prices, 3)
        assert result == [0.0, 0.0, 10.0]  # (5+10+15)/3

    def test_sma_invalid_period_raises(self):
        """SMA with period > len(prices) raises ValueError."""
        from src.tools.indicators import calculate_sma

        try:
            calculate_sma([1.0, 2.0], 3)
            assert False, "Expected ValueError"
        except ValueError:
            pass

    def test_sma_zero_period_raises(self):
        """SMA with period 0 raises ValueError."""
        from src.tools.indicators import calculate_sma

        try:
            calculate_sma([1.0, 2.0], 0)
            assert False, "Expected ValueError"
        except ValueError:
            pass


class TestRSI:
    """Tests for calculate_rsi."""

    def test_rsi_all_gains(self):
        """RSI with all upward moves should be 100."""
        from src.tools.indicators import calculate_rsi

        # 16 prices, monotonically increasing — all gains, no losses
        prices = [float(i) for i in range(1, 17)]  # 1.0, 2.0, ..., 16.0
        rsi = calculate_rsi(prices, period=14)
        assert rsi == 100.0

    def test_rsi_all_losses(self):
        """RSI with all downward moves should be 0."""
        from src.tools.indicators import calculate_rsi

        prices = [float(i) for i in range(16, 0, -1)]  # 16.0, 15.0, ..., 1.0
        rsi = calculate_rsi(prices, period=14)
        assert rsi == 0.0

    def test_rsi_flat_prices(self):
        """RSI with no price changes should be 100 (no losses, gains zero too)."""
        from src.tools.indicators import calculate_rsi

        # When prices don't change: all deltas are 0, avg_gain = 0, avg_loss = 0
        # Then RS = 0/0 which we handle: if avg_loss == 0, return 100.0
        prices = [5.0] * 16
        rsi = calculate_rsi(prices, period=14)
        assert rsi == 100.0  # No losses → 100

    def test_rsi_known_value(self):
        """RSI should produce a value in the 0-100 range for mixed data."""
        from src.tools.indicators import calculate_rsi

        # Mixed data: 44, 44.34, 44.09, 43.61, 44.33, ... (sample OHLC)
        prices = [
            44.0, 44.34, 44.09, 43.61, 44.33, 44.83, 45.10, 45.42,
            45.84, 46.08, 45.89, 46.03, 45.61, 46.28, 46.28, 46.00,
        ]
        rsi = calculate_rsi(prices, period=14)
        assert 0.0 <= rsi <= 100.0
        # With mostly upward movement, RSI should be > 50
        assert rsi > 50.0

    def test_rsi_insufficient_data(self):
        """RSI with insufficient data raises ValueError."""
        from src.tools.indicators import calculate_rsi

        try:
            calculate_rsi([1.0, 2.0, 3.0], period=14)
            assert False, "Expected ValueError"
        except ValueError:
            pass


class TestMACD:
    """Tests for calculate_macd."""

    def test_macd_output_structure(self):
        """MACD should return dict with macd_line, signal_line, histogram."""
        from src.tools.indicators import calculate_macd

        # Generate 30 prices
        prices = [100.0 + i * 0.5 for i in range(30)]
        result = calculate_macd(prices)

        assert "macd_line" in result
        assert "signal_line" in result
        assert "histogram" in result
        assert len(result["macd_line"]) == 30
        assert len(result["signal_line"]) == 30
        assert len(result["histogram"]) == 30

    def test_macd_histogram_consistency(self):
        """Histogram should equal MACD line minus signal line."""
        from src.tools.indicators import calculate_macd

        prices = [100.0 + i * 0.3 + (i % 5) * 0.5 for i in range(30)]
        result = calculate_macd(prices)

        for i in range(len(prices)):
            expected = round(result["macd_line"][i] - result["signal_line"][i], 10)
            actual = round(result["histogram"][i], 10)
            assert expected == actual, f"Mismatch at index {i}: {expected} vs {actual}"

    def test_macd_trending_up(self):
        """MACD for a strong uptrend should have positive MACD line."""
        from src.tools.indicators import calculate_macd

        # Strong uptrend
        prices = [100.0 + i * 2.0 for i in range(30)]
        result = calculate_macd(prices)

        # Last MACD value should be positive in uptrend
        last_macd = result["macd_line"][-1]
        assert last_macd > 0, f"Expected positive MACD in uptrend, got {last_macd}"

    def test_macd_insufficient_data(self):
        """MACD with insufficient data raises ValueError."""
        from src.tools.indicators import calculate_macd

        try:
            calculate_macd([1.0, 2.0, 3.0], fast_period=12, slow_period=26)
            assert False, "Expected ValueError"
        except ValueError:
            pass
