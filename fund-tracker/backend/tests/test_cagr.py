"""Additional CAGR and math edge case tests."""
import pytest
from app.utils.math_utils import (
    cumulative_return, cagr, log_returns, annualized_stddev, projected_value
)


class TestLogReturns:
    def test_empty_returns_empty_list(self):
        assert log_returns([]) == []

    def test_single_element_returns_empty_list(self):
        assert log_returns([100.0]) == []

    def test_flat_series_all_zero(self):
        series = [100.0, 100.0, 100.0]
        result = log_returns(series)
        assert len(result) == 2
        for r in result:
            assert r == pytest.approx(0.0, abs=1e-10)

    def test_growing_series_positive_returns(self):
        series = [100.0, 110.0, 121.0]
        result = log_returns(series)
        assert all(r > 0 for r in result)

    def test_skips_zero_navs(self):
        # Zero values should be skipped to avoid log(0)
        series = [100.0, 0.0, 110.0]
        result = log_returns(series)
        # Should have fewer than 2 valid entries
        assert len(result) < 2


class TestAnnualizedStddev:
    def test_constant_series_zero_volatility(self):
        series = [100.0] * 300
        sigma = annualized_stddev(series)
        assert sigma == pytest.approx(0.0, abs=1e-10)

    def test_volatile_series_nonzero_volatility(self):
        import random
        rng = random.Random(42)
        series = [100.0]
        for _ in range(500):
            change = rng.gauss(0, 0.01)
            series.append(series[-1] * (1 + change))
        sigma = annualized_stddev(series)
        assert sigma > 0.05
        assert sigma < 0.50  # sanity: daily noise ~1% -> annual ~16%

    def test_insufficient_data_returns_zero(self):
        assert annualized_stddev([100.0]) == 0.0
        assert annualized_stddev([]) == 0.0


class TestProjectedValue:
    def test_zero_rate_returns_initial(self):
        assert projected_value(1000.0, 0.0, 5) == pytest.approx(1000.0)

    def test_ten_percent_one_year(self):
        assert projected_value(1000.0, 0.10, 1) == pytest.approx(1100.0)

    def test_ten_percent_two_years(self):
        assert projected_value(1000.0, 0.10, 2) == pytest.approx(1210.0)

    def test_negative_rate(self):
        # -20% per year for 1 year
        assert projected_value(1000.0, -0.20, 1) == pytest.approx(800.0)

    def test_total_loss_bear_floor(self):
        # -99% CAGR (bear floor)
        result = projected_value(1000.0, -0.99, 5)
        assert result > 0  # never goes negative
