"""OpenFIGI adapter for ISIN-to-ticker resolution."""
import logging
import time
from typing import Optional

import httpx

from .base import ISINLookupError

logger = logging.getLogger(__name__)

OPENFIGI_URL = "https://api.openfigi.com/v3/mapping"


class OpenFIGIAdapter:
    """Resolves ISINs to exchange tickers using the free OpenFIGI API."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key

    def isin_to_ticker(self, isin: str) -> Optional[str]:
        """Map an ISIN to the most appropriate ticker symbol.

        Args:
            isin: 12-character ISIN code (e.g. "US78462F1030")

        Returns:
            Ticker string (e.g. "SPY") or None if not found.

        Raises:
            ISINLookupError: if the API is unavailable or the ISIN is invalid.
        """
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["X-OPENFIGI-APIKEY"] = self.api_key

        payload = [{"idType": "ID_ISIN", "idValue": isin}]

        for attempt in range(2):
            try:
                with httpx.Client(timeout=15.0) as client:
                    resp = client.post(OPENFIGI_URL, json=payload, headers=headers)

                if resp.status_code == 429:
                    if attempt == 0:
                        logger.warning("OpenFIGI rate limit hit, waiting 1s...")
                        time.sleep(1)
                        continue
                    raise ISINLookupError(
                        f"OpenFIGI rate limit exceeded for ISIN {isin}"
                    )

                resp.raise_for_status()
                break

            except httpx.HTTPStatusError as exc:
                raise ISINLookupError(
                    f"OpenFIGI returned HTTP {exc.response.status_code} for ISIN {isin}"
                ) from exc
            except httpx.RequestError as exc:
                if attempt == 0:
                    time.sleep(2)
                    continue
                raise ISINLookupError(
                    f"OpenFIGI request failed for ISIN {isin}: {exc}"
                ) from exc

        try:
            data = resp.json()
        except Exception as exc:
            raise ISINLookupError(f"OpenFIGI returned invalid JSON: {exc}") from exc

        if not data or not data[0].get("data"):
            logger.info("OpenFIGI found no matches for ISIN %s", isin)
            return None

        matches = data[0]["data"]

        # Prefer US-listed instruments
        us_match = next(
            (m for m in matches if m.get("exchCode") in ("US", "UN", "UA", "UW")),
            None,
        )
        best = us_match or matches[0]
        ticker = best.get("ticker")

        logger.info("OpenFIGI: ISIN %s -> ticker %s", isin, ticker)
        return ticker
