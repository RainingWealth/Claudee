"""Tests for trailing return calculations."""
import pytest
from datetime import date, timedelta

from app.services.returns_service import compute_trailing_returns, ReturnsResult
from app.utils.math_utils import cumulative_return, cagr


# ── Cumulative return ──────────────────────────────────────────────────────────

def test_cumulative_return_positive():
    assert cumulative_return(100.0, 127.0) == pytest.approx(0.27, rel=1e-4)


def test_cumulative_return_loss():
    assert cumulative_return(100.0, 80.0) == pytest.approx(-0.20, rel=1e-4)


def test_cumulative_return_zero_end():
    assert cumulative_return(100.0, 0.0) == pytest.approx(-1.0, rel=1e-4)


def test_cumulative_return_zero_start_raises():
    with pytest.raises(ValueError):
        cumulative_return(0.0, 100.0)


def test_cumulative_return_negative_start_raises():
    with pytest.raises(ValueError):
        cumulative_return(-10.0, 100.0)


# ── CAGR ───────────────────────────────────────────────────────────────────────

def test_cagr_exact_two_years():
    # 100 -> 121 in exactly 2 years = 10% CAGR
    assert cagr(100.0, 121.0, 2.0) == pytest.approx(0.10, rel=1e-4)


def test_cagr_exact_five_years():
    # 100 -> 161.051 in 5 years ≈ 10% CAGR
    assert cagr(100.0, 161.051, 5.0) == pytest.approx(0.10, rel=1e-3)


def test_cagr_zero_start_raises():
    with pytest.raises(ValueError):
        cagr(0.0, 100.0, 3.0)


def test_cagr_zero_years_raises():
    with pytest.raises(ValueError):
        cagr(100.0, 150.0, 0.0)


def test_cagr_negative_years_raises():
    with pytest.raises(ValueError):
        cagr(100.0, 150.0, -1.0)


def test_cagr_total_loss():
    assert cagr(100.0, 0.0, 5.0) == pytest.approx(-1.0, rel=1e-4)


# ── compute_trailing_returns ───────────────────────────────────────────────────

def _build_series(years: float, daily_rate: float = 0.0003) -> list[tuple[date, float]]:
    """Build a synthetic daily price series."""
    base = date(2019, 1, 2)
    total_days = int(years * 365)
    series = []
    nav = 100.0
    for i in range(total_days):
        d = base + timedelta(days=i)
        if d.weekday() < 5:  # weekdays only
            nav *= (1 + daily_rate)
            series.append((d, nav))
    return series


def test_trailing_returns_3y_data_complete():
    series = _build_series(6.0)  # 6 years of data
    result = compute_trailing_returns(series, window_years=3)
    assert result.data_complete is True
    assert result.cagr is not None
    assert result.cumulative_return is not None
    assert result.cagr > 0


def test_trailing_returns_5y_data_complete():
    series = _build_series(6.0)
    result = compute_trailing_returns(series, window_years=5)
    assert result.data_complete is True
    assert result.cagr > 0


def test_trailing_returns_insufficient_history():
    # Only 1 year of data, requesting 3Y window
    # The implementation computes whatever CAGR it can, but marks data_complete=False
    series = _build_series(1.0)
    result = compute_trailing_returns(series, window_years=3)
    assert result.data_complete is False
    assert result.warning is not None
    # cagr may be computed on partial data (with warning) — that is the correct behaviour
    assert "insufficient" in (result.warning or "").lower() or "gap" in (result.warning or "").lower()


def test_trailing_returns_empty_series():
    result = compute_trailing_returns([], window_years=2)
    assert result.data_complete is False
    assert result.cagr is None


def test_trailing_returns_single_row():
    series = [(date(2024, 1, 2), 100.0)]
    result = compute_trailing_returns(series, window_years=2)
    assert result.data_complete is False


def test_trailing_returns_cagr_approximately_correct():
    """Known growth rate: ~7.77% daily compound -> ~21% CAGR annualised."""
    series = _build_series(5.0, daily_rate=0.0008)  # ~21% annual
    result = compute_trailing_returns(series, window_years=3)
    assert result.data_complete is True
    # CAGR should be roughly 0.0008 * 252 ≈ 0.20 annualised
    assert 0.15 < result.cagr < 0.30


def test_trailing_returns_label_and_years():
    series = _build_series(6.0)
    result = compute_trailing_returns(series, window_years=2)
    assert result.label == "2Y"
    assert result.years == 2


def test_trailing_returns_start_end_populated():
    series = _build_series(6.0)
    result = compute_trailing_returns(series, window_years=2)
    assert result.start_date is not None
    assert result.end_date is not None
    assert result.start_nav is not None
    assert result.end_nav is not None
    assert result.start_date < result.end_date
