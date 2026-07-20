"""Integration tests for the funds API endpoints."""
import pytest
from app.models.fund import Fund
from app.models.price import PriceHistory
from datetime import date, timedelta


def _seed_fund(db_session, ticker="TESTFUND", name="Test Fund ETF") -> Fund:
    """Insert a minimal fund into the test DB."""
    fund = Fund(ticker=ticker, name=name, currency="USD", is_demo=False)
    db_session.add(fund)
    db_session.flush()
    return fund


def _seed_prices(db_session, fund_id: int, years: float = 3.0, daily_rate: float = 0.0003):
    """Insert synthetic price history."""
    base_date = date(2021, 1, 4)
    nav = 100.0
    for i in range(int(years * 365)):
        d = base_date + timedelta(days=i)
        if d.weekday() < 5:
            nav *= (1 + daily_rate)
            db_session.add(PriceHistory(
                fund_id=fund_id, price_date=d, nav=nav, source="test"
            ))
    db_session.flush()


class TestFundListEndpoint:
    def test_empty_list(self, client):
        resp = client.get("/api/v1/funds")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_with_one_fund(self, client, db_session):
        _seed_fund(db_session)
        resp = client.get("/api/v1/funds")
        assert resp.status_code == 200
        assert len(resp.json()) == 1

    def test_filter_by_demo_false(self, client, db_session):
        fund = _seed_fund(db_session)
        demo_fund = Fund(ticker="DEMO1", name="Demo Fund", currency="USD", is_demo=True)
        db_session.add(demo_fund)
        db_session.flush()

        resp = client.get("/api/v1/funds?demo=false")
        assert resp.status_code == 200
        names = [f["name"] for f in resp.json()]
        assert "Demo Fund" not in names

    def test_filter_by_demo_true(self, client, db_session):
        Fund(ticker="DEMO2", name="Demo Fund 2", currency="USD", is_demo=True)
        demo_fund = Fund(ticker="DEMO2", name="Demo Fund 2", currency="USD", is_demo=True)
        db_session.add(demo_fund)
        db_session.flush()

        resp = client.get("/api/v1/funds?demo=true")
        assert resp.status_code == 200
        for f in resp.json():
            assert f["is_demo"] is True


class TestFundDetailEndpoint:
    def test_not_found_returns_404(self, client):
        resp = client.get("/api/v1/funds/99999")
        assert resp.status_code == 404

    def test_found_returns_fund_data(self, client, db_session):
        fund = _seed_fund(db_session, ticker="DETFUND", name="Detail Fund")
        resp = client.get(f"/api/v1/funds/{fund.id}")
        assert resp.status_code == 200
        data = resp.json()
        assert data["ticker"] == "DETFUND"
        assert data["name"] == "Detail Fund"
        assert "holdings" in data


class TestFundDeleteEndpoint:
    def test_delete_normal_fund(self, client, db_session):
        fund = _seed_fund(db_session, ticker="DELFUND", name="Delete Me")
        resp = client.delete(f"/api/v1/funds/{fund.id}")
        assert resp.status_code == 204

    def test_delete_demo_fund_returns_400(self, client, db_session):
        demo = Fund(ticker="DEMODELFUND", name="Demo Delete", currency="USD", is_demo=True)
        db_session.add(demo)
        db_session.flush()
        resp = client.delete(f"/api/v1/funds/{demo.id}")
        assert resp.status_code == 400

    def test_delete_nonexistent_returns_404(self, client):
        resp = client.delete("/api/v1/funds/99999")
        assert resp.status_code == 404


class TestReturnsEndpoint:
    def test_returns_no_data(self, client, db_session):
        fund = _seed_fund(db_session, ticker="NOHIST", name="No History Fund")
        resp = client.get(f"/api/v1/funds/{fund.id}/returns")
        assert resp.status_code == 200
        data = resp.json()
        assert data["latest_nav"] is None
        for window in data["windows"]:
            assert window["data_complete"] is False

    def test_returns_with_3y_data(self, client, db_session):
        fund = _seed_fund(db_session, ticker="HAS3Y", name="Has 3Y History")
        _seed_prices(db_session, fund.id, years=4.0)

        resp = client.get(f"/api/v1/funds/{fund.id}/returns")
        assert resp.status_code == 200
        data = resp.json()
        assert data["latest_nav"] is not None

        windows = {w["label"]: w for w in data["windows"]}
        assert windows["2Y"]["data_complete"] is True
        assert windows["3Y"]["data_complete"] is True
        assert windows["2Y"]["cagr"] is not None
        assert windows["3Y"]["cagr"] is not None

    def test_chart_endpoint_1y(self, client, db_session):
        fund = _seed_fund(db_session, ticker="CHART1Y", name="Chart Fund")
        _seed_prices(db_session, fund.id, years=2.0)

        resp = client.get(f"/api/v1/funds/{fund.id}/chart?period=1y")
        assert resp.status_code == 200
        data = resp.json()
        assert data["period"] == "1y"
        assert len(data["series"]) > 0


class TestHealthEndpoint:
    def test_health_ok(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"
