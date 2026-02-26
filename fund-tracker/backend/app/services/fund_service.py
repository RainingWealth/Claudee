"""Fund identifier resolution and management service."""
import logging
import re
from datetime import date, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from ..adapters.openfigi_adapter import OpenFIGIAdapter
from ..adapters.yfinance_adapter import YFinanceAdapter
from ..adapters.base import AdapterError, ISINLookupError
from ..config import get_settings
from ..models.fund import Fund, FundHolding
from ..models.price import PriceHistory
from .audit_service import write_audit

logger = logging.getLogger(__name__)

# ISIN: 2 uppercase letters + 10 uppercase alphanumeric characters
ISIN_REGEX = re.compile(r"^[A-Z]{2}[A-Z0-9]{10}$")
# Internal code heuristics: contains underscore, or starts with FUND/INT/MY
INTERNAL_CODE_REGEX = re.compile(r"^(FUND|INT|MY|PRIV|DEMO)_", re.IGNORECASE)


class IdentifierNotFoundError(Exception):
    pass


def _detect_identifier_type(query: str) -> str:
    """Classify a query string as 'isin', 'internal_code', or 'ticker'."""
    q = query.strip().upper()
    if ISIN_REGEX.match(q):
        return "isin"
    if "_" in q or INTERNAL_CODE_REGEX.match(q):
        return "internal_code"
    return "ticker"


def resolve_and_create_fund(db: Session, query: str) -> tuple[Fund, bool]:
    """Resolve an identifier to a Fund record, creating it if needed.

    Args:
        db: database session
        query: raw user input (ticker, ISIN, or internal code)

    Returns:
        (Fund, created) tuple where created=True if a new fund was inserted.

    Raises:
        IdentifierNotFoundError: if the identifier cannot be resolved.
        AdapterError: if the data provider is unavailable.
    """
    settings = get_settings()
    q = query.strip().upper()
    id_type = _detect_identifier_type(q)

    ticker: Optional[str] = None
    isin: Optional[str] = None

    if id_type == "isin":
        isin = q
        # Check if we already know this fund
        existing = db.query(Fund).filter(Fund.isin == isin).first()
        if existing:
            return existing, False

        # Resolve ISIN to ticker
        openfigi = OpenFIGIAdapter(api_key=settings.OPENFIGI_API_KEY)
        try:
            ticker = openfigi.isin_to_ticker(isin)
        except ISINLookupError as exc:
            raise IdentifierNotFoundError(str(exc)) from exc

        if not ticker:
            raise IdentifierNotFoundError(
                f"ISIN {isin!r} could not be mapped to a ticker symbol. "
                "It may not be listed on a supported exchange."
            )

    elif id_type == "internal_code":
        existing = db.query(Fund).filter(Fund.internal_code == q).first()
        if existing:
            return existing, False
        # Internal codes without a ticker must be uploaded via CSV
        raise IdentifierNotFoundError(
            f"Internal code {q!r} not found. "
            "Upload price history via CSV to register this fund."
        )

    else:  # ticker
        ticker = q
        existing = db.query(Fund).filter(Fund.ticker == ticker).first()
        if existing:
            return existing, False

    # Fetch metadata
    yf_adapter = YFinanceAdapter()
    try:
        meta = yf_adapter.fetch_fund_metadata(ticker)
    except AdapterError as exc:
        logger.warning("Metadata fetch failed for %s: %s", ticker, exc)
        meta = {"name": ticker, "currency": "USD", "asset_class": "", "objective": "", "style": ""}

    fund = Fund(
        ticker=ticker,
        isin=isin,
        name=meta.get("name") or ticker,
        asset_class=meta.get("asset_class") or "",
        objective=meta.get("objective") or "",
        style=meta.get("style") or "",
        currency=meta.get("currency") or "USD",
        is_demo=False,
    )
    db.add(fund)
    db.flush()  # get fund.id without committing

    # Fetch price history (max 7 years for full 5Y window + buffer)
    _fetch_and_store_prices(db, fund, yf_adapter, years=7)

    # Fetch top holdings
    try:
        raw_holdings = yf_adapter.fetch_top_holdings(ticker)
        for h in raw_holdings:
            holding = FundHolding(
                fund_id=fund.id,
                holding_name=h["holding_name"],
                weight=h.get("weight"),
                holding_type=h.get("holding_type", "equity"),
                as_of_date=date.today(),
            )
            db.add(holding)
    except Exception as exc:
        logger.debug("Holdings fetch skipped for %s: %s", ticker, exc)

    db.commit()

    write_audit(
        db,
        event_type="fund_search",
        fund_id=fund.id,
        detail={"query": query, "id_type": id_type, "ticker": ticker},
        status="success",
    )
    return fund, True


def _fetch_and_store_prices(
    db: Session, fund: Fund, adapter: YFinanceAdapter, years: int = 7
) -> int:
    """Fetch price history and upsert into PriceHistory table.

    Returns number of rows upserted.
    """
    end = date.today()
    start = end - timedelta(days=years * 365)

    try:
        rows = adapter.fetch_price_history(fund.ticker, start, end)
    except AdapterError as exc:
        write_audit(
            db,
            event_type="price_refresh",
            fund_id=fund.id,
            detail={"ticker": fund.ticker, "error": str(exc)},
            status="error",
            error_msg=str(exc),
        )
        logger.error("Price fetch failed for fund %d (%s): %s", fund.id, fund.ticker, exc)
        return 0

    if not rows:
        return 0

    # Existing dates for this fund to skip
    existing_dates = {
        r.price_date
        for r in db.query(PriceHistory.price_date)
        .filter(PriceHistory.fund_id == fund.id)
        .all()
    }

    count = 0
    for row in rows:
        if row["date"] in existing_dates:
            continue
        ph = PriceHistory(
            fund_id=fund.id,
            price_date=row["date"],
            nav=row["nav"],
            source=adapter.source_name,
        )
        db.add(ph)
        count += 1

    write_audit(
        db,
        event_type="price_refresh",
        fund_id=fund.id,
        detail={"source": adapter.source_name, "rows_added": count, "ticker": fund.ticker},
        status="success",
    )
    return count


def get_fund_with_latest_nav(db: Session, fund: Fund) -> dict:
    """Return fund summary dict including latest NAV and date."""
    latest = (
        db.query(PriceHistory.price_date, PriceHistory.nav)
        .filter(PriceHistory.fund_id == fund.id)
        .order_by(PriceHistory.price_date.desc())
        .first()
    )
    return {
        "latest_nav": float(latest.nav) if latest else None,
        "latest_date": latest.price_date if latest else None,
    }


def refresh_fund_prices(db: Session, fund: Fund) -> int:
    """Re-fetch price history from yfinance and update the cache.

    Returns the number of new rows added.
    """
    from .cache_service import invalidate_cache
    adapter = YFinanceAdapter()
    count = _fetch_and_store_prices(db, fund, adapter, years=7)
    invalidate_cache(db, fund.id)
    return count
