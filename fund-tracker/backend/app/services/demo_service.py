"""Demo mode: seed and reset demo data."""
import logging
import os
from datetime import date
from pathlib import Path

from sqlalchemy.orm import Session

from ..adapters.csv_adapter import CsvAdapter
from ..adapters.yfinance_adapter import YFinanceAdapter
from ..models.fund import Fund, FundHolding
from ..models.price import PriceHistory
from .audit_service import write_audit
from .fund_service import _fetch_and_store_prices

logger = logging.getLogger(__name__)

DEMO_FUNDS = [
    {
        "ticker": "SPY",
        "name": "SPDR S&P 500 ETF Trust",
        "internal_code": "DEMO_SPY",
        "asset_class": "ETF",
        "style": "Large Blend",
        "currency": "USD",
        "objective": (
            "Seeks to provide investment results that, before expenses, "
            "correspond generally to the price and yield performance of the S&P 500 Index."
        ),
    },
    {
        "ticker": "VWRA.L",
        "name": "Vanguard FTSE All-World UCITS ETF",
        "internal_code": "DEMO_VWRA",
        "asset_class": "ETF",
        "style": "Global Large Blend",
        "currency": "USD",
        "objective": (
            "Seeks to track the performance of the FTSE All-World Index, "
            "which covers large- and mid-cap stocks from developed and emerging markets."
        ),
    },
    {
        "ticker": None,
        "name": "Sample Private Fund",
        "internal_code": "DEMO_PRIVATE",
        "asset_class": "Multi-Asset",
        "style": "Balanced",
        "currency": "USD",
        "objective": (
            "This is a demo fund using a sample uploaded CSV with synthetic NAV data. "
            "It represents the kind of private or unlisted fund that can be tracked "
            "via the CSV upload feature."
        ),
    },
]

# Sample holdings for demo funds
DEMO_HOLDINGS = {
    "DEMO_SPY": [
        ("Apple Inc.", 0.0721, "equity"),
        ("Microsoft Corp.", 0.0631, "equity"),
        ("NVIDIA Corp.", 0.0589, "equity"),
        ("Amazon.com Inc.", 0.0352, "equity"),
        ("Meta Platforms Inc.", 0.0249, "equity"),
    ],
    "DEMO_VWRA": [
        ("Apple Inc.", 0.0421, "equity"),
        ("Microsoft Corp.", 0.0371, "equity"),
        ("NVIDIA Corp.", 0.0289, "equity"),
        ("Amazon.com Inc.", 0.0212, "equity"),
        ("Alphabet Inc.", 0.0189, "equity"),
    ],
    "DEMO_PRIVATE": [
        ("Global Equity", 0.60, "sector"),
        ("Fixed Income", 0.30, "sector"),
        ("Cash & Alternatives", 0.10, "sector"),
    ],
}

# Path to the sample CSV (relative to this file, resolved at runtime)
DEMO_CSV_PATH = Path(__file__).parent.parent.parent.parent / "frontend" / "public" / "demo" / "sample_nav.csv"


def seed(db: Session) -> int:
    """Seed demo data into the database. Idempotent.

    Returns the number of new funds seeded.
    """
    seeded = 0
    adapter = YFinanceAdapter()
    csv_adapter = CsvAdapter()

    for fund_def in DEMO_FUNDS:
        internal_code = fund_def["internal_code"]
        existing = db.query(Fund).filter(Fund.internal_code == internal_code).first()
        if existing:
            logger.info("Demo fund %s already exists, skipping.", internal_code)
            continue

        fund = Fund(
            ticker=fund_def.get("ticker"),
            name=fund_def["name"],
            internal_code=internal_code,
            asset_class=fund_def.get("asset_class", ""),
            style=fund_def.get("style", ""),
            currency=fund_def.get("currency", "USD"),
            objective=fund_def.get("objective", ""),
            is_demo=True,
        )
        db.add(fund)
        db.flush()  # get fund.id

        # Add holdings
        for holding_name, weight, htype in DEMO_HOLDINGS.get(internal_code, []):
            db.add(FundHolding(
                fund_id=fund.id,
                holding_name=holding_name,
                weight=weight,
                holding_type=htype,
                as_of_date=date.today(),
            ))

        # Fetch price history
        if fund.ticker:
            try:
                _fetch_and_store_prices(db, fund, adapter, years=7)
                logger.info("Seeded prices for demo fund %s (%s)", internal_code, fund.ticker)
            except Exception as exc:
                logger.warning("Could not fetch prices for %s: %s", fund.ticker, exc)
        else:
            # CSV-only fund: load from sample_nav.csv
            if DEMO_CSV_PATH.exists():
                try:
                    raw = DEMO_CSV_PATH.read_bytes()
                    rows = csv_adapter.parse(raw)
                    for row in rows:
                        db.add(PriceHistory(
                            fund_id=fund.id,
                            price_date=row["date"],
                            nav=row["nav"],
                            source="csv",
                        ))
                    logger.info(
                        "Imported %d rows from sample CSV for %s", len(rows), internal_code
                    )
                except Exception as exc:
                    logger.warning("Could not load demo CSV: %s", exc)
            else:
                logger.warning("Demo CSV not found at %s", DEMO_CSV_PATH)

        db.commit()
        write_audit(
            db,
            event_type="demo_seed",
            fund_id=fund.id,
            detail={"internal_code": internal_code},
            status="success",
        )
        seeded += 1

    return seeded


def reset(db: Session) -> int:
    """Remove all demo funds and their associated data.

    Returns the number of funds deleted.
    """
    demo_funds = db.query(Fund).filter(Fund.is_demo == True).all()  # noqa: E712
    count = len(demo_funds)
    for fund in demo_funds:
        db.delete(fund)
    db.commit()

    write_audit(
        db,
        event_type="demo_seed",
        fund_id=None,
        detail={"action": "reset", "deleted": count},
        status="success",
    )
    logger.info("Deleted %d demo funds", count)
    return count
