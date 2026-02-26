"""Yahoo Finance data adapter using the yfinance library."""
import logging
from datetime import date, timedelta

import yfinance as yf

from .base import DataAdapter, AdapterError

logger = logging.getLogger(__name__)


class YFinanceAdapter(DataAdapter):
    """Fetches price history and fund metadata from Yahoo Finance."""

    @property
    def source_name(self) -> str:
        return "yfinance"

    def fetch_price_history(
        self, identifier: str, start: date, end: date
    ) -> list[dict]:
        """Download adjusted-close price series from Yahoo Finance.

        Args:
            identifier: Yahoo Finance ticker symbol (e.g. "SPY", "VWRA.L")
            start: inclusive start date
            end: inclusive end date

        Returns:
            List of {"date": date, "nav": float} dicts, ascending by date.
        """
        try:
            ticker_obj = yf.Ticker(identifier)
            # end+1 because yfinance treats end as exclusive
            hist = ticker_obj.history(
                start=start.isoformat(),
                end=(end + timedelta(days=1)).isoformat(),
                auto_adjust=True,  # split + dividend adjusted
            )
        except Exception as exc:
            raise AdapterError(
                f"yfinance fetch failed for {identifier!r}: {exc}"
            ) from exc

        if hist is None or hist.empty:
            raise AdapterError(
                f"yfinance returned no data for {identifier!r} "
                f"between {start} and {end}"
            )

        rows = []
        for ts, row in hist.iterrows():
            close = float(row["Close"])
            if close > 0:
                rows.append({"date": ts.date(), "nav": close})

        if not rows:
            raise AdapterError(
                f"yfinance returned only invalid prices for {identifier!r}"
            )

        rows.sort(key=lambda r: r["date"])
        return rows

    def fetch_fund_metadata(self, identifier: str) -> dict:
        """Fetch fund info dict from yfinance Ticker.info."""
        try:
            info = yf.Ticker(identifier).info
        except Exception as exc:
            raise AdapterError(
                f"yfinance metadata fetch failed for {identifier!r}: {exc}"
            ) from exc

        if not info or "symbol" not in info:
            logger.warning("yfinance returned sparse info for %s", identifier)

        return {
            "name": (
                info.get("longName")
                or info.get("shortName")
                or identifier
            ),
            "currency": info.get("currency", "USD"),
            "asset_class": info.get("quoteType", ""),
            "objective": info.get("longBusinessSummary", ""),
            "style": info.get("categoryName") or info.get("fundFamily", ""),
        }

    def fetch_top_holdings(self, identifier: str) -> list[dict]:
        """Return top fund holdings from yfinance (ETF/mutual fund only)."""
        try:
            ticker_obj = yf.Ticker(identifier)
            holdings = ticker_obj.funds_data
            if holdings is None:
                return []
            top = getattr(holdings, "top_holdings", None)
            if top is None or top.empty:
                return []
            result = []
            for _, row in top.iterrows():
                result.append({
                    "holding_name": str(row.get("Holding Label", "")),
                    "weight": float(row.get("% of Net Assets", 0)) / 100.0,
                    "holding_type": "equity",
                })
            return result[:10]
        except Exception as exc:
            logger.debug("Could not fetch holdings for %s: %s", identifier, exc)
            return []
