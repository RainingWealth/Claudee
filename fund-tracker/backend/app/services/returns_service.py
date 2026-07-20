"""Core return calculation service.

This module is the single source of truth for all trailing-return math.
All calculations use daily NAV series stored in PriceHistory.
"""
import logging
from dataclasses import dataclass, field
from datetime import date
from typing import Optional

from dateutil.relativedelta import relativedelta
from sqlalchemy.orm import Session

from ..models.price import PriceHistory
from ..utils.math_utils import cumulative_return, cagr
from ..utils.date_utils import trailing_window_start

logger = logging.getLogger(__name__)

WINDOW_DEFINITIONS = [
    {"label": "2Y", "years": 2},
    {"label": "3Y", "years": 3},
    {"label": "5Y", "years": 5},
]


@dataclass
class ReturnWindow:
    label: str
    years: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_nav: Optional[float] = None
    end_nav: Optional[float] = None
    cumulative_return: Optional[float] = None
    cagr: Optional[float] = None
    data_complete: bool = True
    missing_days: int = 0
    warning: Optional[str] = None


@dataclass
class ReturnsResult:
    fund_id: int
    latest_nav: Optional[float] = None
    latest_date: Optional[date] = None
    windows: list[ReturnWindow] = field(default_factory=list)


def _price_series_for_fund(db: Session, fund_id: int) -> list[tuple[date, float]]:
    """Fetch the full price series from DB, ordered ascending by date."""
    rows = (
        db.query(PriceHistory.price_date, PriceHistory.nav)
        .filter(PriceHistory.fund_id == fund_id)
        .order_by(PriceHistory.price_date.asc())
        .all()
    )
    return [(r.price_date, float(r.nav)) for r in rows]


def compute_trailing_returns(
    series: list[tuple[date, float]], window_years: int
) -> ReturnWindow:
    """Compute a single trailing return window from a price series.

    Args:
        series: list of (date, nav) tuples, sorted ascending
        window_years: 2, 3, or 5

    Returns:
        ReturnWindow dataclass with computed metrics.
    """
    label = f"{window_years}Y"
    result = ReturnWindow(label=label, years=window_years)

    if len(series) < 2:
        result.data_complete = False
        result.warning = f"Insufficient price history to compute {label} return."
        return result

    end_date, end_nav = series[-1]
    result.end_date = end_date
    result.end_nav = end_nav

    target_start = trailing_window_start(end_date, window_years)

    # Find closest date to target_start in the series
    dates_only = [s[0] for s in series]

    # Find the first date >= target_start
    candidates = [(d, n) for d, n in series if d >= target_start]

    if not candidates:
        result.data_complete = False
        result.warning = (
            f"Insufficient history: data starts {series[0][0]}, "
            f"need data back to ~{target_start} for {label} return."
        )
        return result

    # Check gap between target start and actual start
    actual_start_date, actual_start_nav = candidates[0]
    gap_days = (actual_start_date - target_start).days

    if gap_days > 7:  # more than ~5 trading days tolerance
        result.data_complete = False
        result.warning = (
            f"Data gap at start of {label} window: expected data around "
            f"{target_start}, closest is {actual_start_date} ({gap_days} days off)."
        )

    result.start_date = actual_start_date
    result.start_nav = actual_start_nav

    # Compute actual years elapsed
    actual_years = (end_date - actual_start_date).days / 365.25

    if actual_years <= 0:
        result.data_complete = False
        result.warning = f"Cannot compute {label} return: start and end date are the same."
        return result

    try:
        result.cumulative_return = cumulative_return(actual_start_nav, end_nav)
        result.cagr = cagr(actual_start_nav, end_nav, actual_years)
    except ValueError as exc:
        result.data_complete = False
        result.warning = f"Calculation error for {label}: {exc}"
        return result

    # Count missing trading days (approximate)
    window_rows = [s for s in series if actual_start_date <= s[0] <= end_date]
    expected_days = int(window_years * 252)
    result.missing_days = max(0, expected_days - len(window_rows))

    if result.missing_days > 10 and result.data_complete:
        result.data_complete = False
        result.warning = (
            f"{result.missing_days} trading days of data missing in {label} window "
            f"({len(window_rows)}/{expected_days} days available). Results may be inaccurate."
        )

    return result


def get_returns_for_fund(db: Session, fund_id: int) -> ReturnsResult:
    """Compute all trailing return windows for a fund from the DB."""
    series = _price_series_for_fund(db, fund_id)

    result = ReturnsResult(fund_id=fund_id)

    if series:
        result.latest_date, latest_nav = series[-1]
        result.latest_nav = latest_nav

    for window_def in WINDOW_DEFINITIONS:
        window = compute_trailing_returns(series, window_def["years"])
        result.windows.append(window)

    return result


def get_chart_series(
    db: Session, fund_id: int, period: str
) -> list[tuple[date, float]]:
    """Return daily NAV series for charting.

    Args:
        period: "1y", "3y", or "5y"
    """
    period_to_years = {"1y": 1, "3y": 3, "5y": 5}
    years = period_to_years.get(period.lower(), 1)

    all_series = _price_series_for_fund(db, fund_id)
    if not all_series:
        return []

    end_date = all_series[-1][0]
    start_date = end_date - relativedelta(years=years)

    return [(d, n) for d, n in all_series if d >= start_date]
