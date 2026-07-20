"""Tests for scenario projection math."""
import pytest
from datetime import date, timedelta

from app.services.scenario_service import compute_scenarios, ScenarioResult


def _build_series_in_db(db_session, fund_id: int, years: float = 6.0, daily_rate: float = 0.0004):
    """Insert a synthetic price series into the test DB."""
    from app.models.price import PriceHistory
    base = date(2018, 1, 2)
    nav = 100.0
    inserted = 0
    for i in range(int(years * 365)):
        d = base + timedelta(days=i)
        if d.weekday() < 5:
            nav *= (1 + daily_rate)
            db_session.add(PriceHistory(
                fund_id=fund_id, price_date=d, nav=nav, source="test"
            ))
            inserted += 1
    db_session.flush()
    return inserted


def _make_demo_fund(db_session):
    from app.models.fund import Fund
    fund = Fund(name="Test Fund", ticker="TEST", currency="USD", is_demo=False)
    db_session.add(fund)
    db_session.flush()
    return fund


class TestScenarioMath:
    def test_bull_above_base(self, db_session):
        fund = _make_demo_fund(db_session)
        _build_series_in_db(db_session, fund.id)
        results = compute_scenarios(db_session, fund.id)
        assert results, "Should produce at least one scenario"
        for r in results:
            assert r.bull_cagr > r.base_cagr, "Bull must exceed base"

    def test_bear_below_base(self, db_session):
        fund = _make_demo_fund(db_session)
        _build_series_in_db(db_session, fund.id)
        results = compute_scenarios(db_session, fund.id)
        for r in results:
            assert r.bear_cagr < r.base_cagr, "Bear must be below base"

    def test_bear_floor_at_minus_99_percent(self, db_session):
        """Highly volatile / crashing series: bear must not go below -99%."""
        fund = _make_demo_fund(db_session)
        _build_series_in_db(db_session, fund.id, daily_rate=-0.003)  # -50% annual
        results = compute_scenarios(db_session, fund.id)
        for r in results:
            assert r.bear_cagr >= -0.99, "Bear CAGR must be floored at -99%"

    def test_disclaimer_present(self, db_session):
        fund = _make_demo_fund(db_session)
        _build_series_in_db(db_session, fund.id)
        results = compute_scenarios(db_session, fund.id)
        for r in results:
            assert len(r.disclaimer) > 50
            assert "educational" in r.disclaimer.lower() or "not" in r.disclaimer.lower()

    def test_three_horizons_produced(self, db_session):
        fund = _make_demo_fund(db_session)
        _build_series_in_db(db_session, fund.id)
        results = compute_scenarios(db_session, fund.id)
        horizons = {r.horizon_years for r in results}
        assert horizons == {1, 3, 5}

    def test_empty_history_returns_empty(self, db_session):
        fund = _make_demo_fund(db_session)
        results = compute_scenarios(db_session, fund.id)
        assert results == []

    def test_projected_values_positive(self, db_session):
        fund = _make_demo_fund(db_session)
        _build_series_in_db(db_session, fund.id)
        results = compute_scenarios(db_session, fund.id)
        for r in results:
            assert r.base_value_per_1000 > 0
            assert r.bull_value_per_1000 > r.base_value_per_1000
            assert r.bear_value_per_1000 > 0  # bear floor prevents negative values
