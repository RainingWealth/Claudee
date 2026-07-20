"""Scenario projection service.

Computes base/bull/bear forward projections for a fund based on
historical CAGR and annualised volatility (std dev of log returns).

IMPORTANT: Projections are educational only. The mandatory disclaimer
is always attached to every ScenarioProjection record.
"""
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional

from sqlalchemy.orm import Session

from ..config import DISCLAIMER_TEXT
from ..models.price import PriceHistory
from ..models.scenario import ScenarioProjection
from ..utils.math_utils import cagr, annualized_stddev, projected_value
from .returns_service import _price_series_for_fund, compute_trailing_returns

logger = logging.getLogger(__name__)

HORIZONS = [1, 3, 5]


@dataclass
class ScenarioResult:
    fund_id: int
    horizon_years: int
    base_cagr: float
    bull_cagr: float
    bear_cagr: float
    sigma_annual: float
    base_value_per_1000: float
    bull_value_per_1000: float
    bear_value_per_1000: float
    notes: Optional[str] = None
    disclaimer: str = DISCLAIMER_TEXT
    generated_at: datetime = field(default_factory=datetime.utcnow)


def _best_available_cagr(series, navs):
    """Compute CAGR from the longest available window (5Y → 3Y → 2Y → full)."""
    for years in [5, 3, 2]:
        window = compute_trailing_returns(series, years)
        if window.data_complete and window.cagr is not None:
            return window.cagr
    # Fallback: use full available history
    if len(series) >= 2:
        start_d, start_n = series[0]
        end_d, end_n = series[-1]
        actual_years = (end_d - start_d).days / 365.25
        if actual_years > 0:
            try:
                return cagr(start_n, end_n, actual_years)
            except ValueError:
                pass
    return 0.0


def compute_scenarios(
    db: Session, fund_id: int, news_notes: Optional[str] = None
) -> list[ScenarioResult]:
    """Compute base/bull/bear scenarios for all standard horizons.

    Args:
        db: database session
        fund_id: fund to compute scenarios for
        news_notes: optional narrative from news_service (stored in notes field only)

    Returns:
        List of ScenarioResult (one per horizon: 1Y, 3Y, 5Y)
    """
    series = _price_series_for_fund(db, fund_id)

    if len(series) < 2:
        logger.warning("Fund %d has insufficient history for scenario projection", fund_id)
        return []

    navs = [n for _, n in series]
    sigma = annualized_stddev(navs)
    base = _best_available_cagr(series, navs)

    bull = base + sigma
    bear = max(base - sigma, -0.99)  # floor at -99%

    results = []
    for horizon in HORIZONS:
        result = ScenarioResult(
            fund_id=fund_id,
            horizon_years=horizon,
            base_cagr=base,
            bull_cagr=bull,
            bear_cagr=bear,
            sigma_annual=sigma,
            base_value_per_1000=projected_value(1000.0, base, horizon),
            bull_value_per_1000=projected_value(1000.0, bull, horizon),
            bear_value_per_1000=projected_value(1000.0, bear, horizon),
            notes=news_notes,
            disclaimer=DISCLAIMER_TEXT,
        )
        results.append(result)

    return results


def persist_scenarios(
    db: Session, fund_id: int, results: list[ScenarioResult]
) -> list[ScenarioProjection]:
    """Save scenario results to the database, replacing any existing ones."""
    # Delete old scenarios for this fund
    db.query(ScenarioProjection).filter(
        ScenarioProjection.fund_id == fund_id
    ).delete()

    records = []
    for r in results:
        record = ScenarioProjection(
            fund_id=r.fund_id,
            generated_at=r.generated_at,
            horizon_years=r.horizon_years,
            base_cagr=r.base_cagr,
            bull_cagr=r.bull_cagr,
            bear_cagr=r.bear_cagr,
            sigma_annual=r.sigma_annual,
            notes=r.notes,
            disclaimer=r.disclaimer,
        )
        db.add(record)
        records.append(record)

    db.commit()
    return records
