"""Morningstar / Lipper plug-in adapter stub.

To integrate a paid data provider:
1. Implement fetch_price_history() and fetch_fund_metadata()
2. Set MORNINGSTAR_API_KEY and MORNINGSTAR_BASE_URL environment variables
3. Register this adapter in fund_service.py's _choose_adapter() function
"""
import logging
from datetime import date

from .base import DataAdapter, AdapterError

logger = logging.getLogger(__name__)


class MorningstarAdapter(DataAdapter):
    """Stub adapter for Morningstar Direct or Lipper data feeds.

    This class provides the interface contract. Implement the methods below
    using your provider's REST API documentation and credentials.
    """

    @property
    def source_name(self) -> str:
        return "morningstar"

    def fetch_price_history(
        self, identifier: str, start: date, end: date
    ) -> list[dict]:
        """Fetch NAV history from Morningstar Direct API.

        Required env vars:
            MORNINGSTAR_API_KEY
            MORNINGSTAR_BASE_URL

        Returns:
            List of {"date": date, "nav": float} dicts.
        """
        raise NotImplementedError(
            "Morningstar adapter not yet configured. "
            "Set MORNINGSTAR_API_KEY and implement this method."
        )

    def fetch_fund_metadata(self, identifier: str) -> dict:
        """Fetch fund metadata from Morningstar Direct API."""
        raise NotImplementedError(
            "Morningstar adapter not yet configured."
        )
