"""
Tests for tool functions (market_data, indicators shape checks).
"""

from __future__ import annotations


class TestGetCurrentPrice:
    """Tests for get_current_price shape/contract."""

    async def test_returns_expected_shape(self):
        """get_current_price should return the expected dict shape."""
        from src.tools.market_data import get_current_price

        result = await get_current_price("BTC/USDT")
        assert isinstance(result, dict)
        assert "symbol" in result
        assert "price" in result
        assert "timestamp" in result
        assert "source" in result
        assert result["symbol"] == "BTC/USDT"
        assert isinstance(result["price"], float)
        assert result["source"] in ("live", "sample")

    async def test_unknown_symbol_fallback(self):
        """Unknown symbol should get a generic fallback price."""
        from src.tools.market_data import get_current_price

        result = await get_current_price("UNKNOWN/PAIR")
        assert result["price"] == 100.0
        assert result["source"] == "sample"

    async def test_case_insensitive_lookup(self):
        """Symbol lookup should be case-insensitive for sample data."""
        from src.tools.market_data import get_current_price, _SAMPLE_PRICES

        result = await get_current_price("btc/usdt")
        assert result["price"] == _SAMPLE_PRICES.get("BTC/USDT")


class TestIndicatorReturnShapes:
    """Tests that indicator functions return correct shapes/types."""

    def test_sma_return_type(self):
        """SMA should return a list of floats."""
        from src.tools.indicators import calculate_sma

        prices = [10.0, 20.0, 30.0, 40.0, 50.0]
        result = calculate_sma(prices, 3)
        assert isinstance(result, list)
        assert all(isinstance(x, float) for x in result)
        assert len(result) == len(prices)

    def test_rsi_return_type(self):
        """RSI should return a float."""
        from src.tools.indicators import calculate_rsi

        prices = [float(i) for i in range(1, 17)]
        result = calculate_rsi(prices, period=14)
        assert isinstance(result, float)
        assert 0.0 <= result <= 100.0

    def test_macd_return_type(self):
        """MACD should return a dict with list values."""
        from src.tools.indicators import calculate_macd

        prices = [100.0 + i for i in range(30)]
        result = calculate_macd(prices)
        assert isinstance(result, dict)
        for key in ("macd_line", "signal_line", "histogram"):
            assert key in result
            assert isinstance(result[key], list)
            assert len(result[key]) == len(prices)
