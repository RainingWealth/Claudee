"""Abstract base class for fund data adapters."""
from abc import ABC, abstractmethod
from datetime import date


class AdapterError(Exception):
    """Raised when a data adapter cannot fetch requested data."""
    pass


class ISINLookupError(AdapterError):
    """Raised when an ISIN cannot be resolved to a ticker."""
    pass


class DataAdapter(ABC):
    """Interface all price-history adapters must implement."""

    @property
    @abstractmethod
    def source_name(self) -> str:
        """Identifier stored in PriceHistory.source (e.g. 'yfinance')."""

    @abstractmethod
    def fetch_price_history(
        self, identifier: str, start: date, end: date
    ) -> list[dict]:
        """Fetch adjusted daily NAV series.

        Returns:
            List of dicts: [{"date": date, "nav": float}, ...]
            Ordered ascending by date.
        """

    @abstractmethod
    def fetch_fund_metadata(self, identifier: str) -> dict:
        """Fetch descriptive metadata for a fund.

        Returns:
            Dict with keys: name, currency, asset_class, objective, style
        """
