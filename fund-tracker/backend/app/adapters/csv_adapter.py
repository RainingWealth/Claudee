"""CSV data adapter for user-uploaded NAV history files."""
import csv
import io
import logging
from datetime import date

from .base import DataAdapter, AdapterError
from ..utils.date_utils import parse_date_flexible

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {"date", "nav"}


class CsvAdapter(DataAdapter):
    """Parses user-uploaded CSV files containing date + NAV columns."""

    @property
    def source_name(self) -> str:
        return "csv"

    def parse(self, file_bytes: bytes) -> list[dict]:
        """Parse raw CSV bytes into a list of {date, nav} dicts.

        Handles:
        - UTF-8 BOM (Excel exports)
        - Multiple date formats
        - Extra whitespace / case-insensitive headers
        - Negative or zero NAV validation

        Returns:
            List of {"date": date, "nav": float} dicts, ascending by date.

        Raises:
            AdapterError: on any parse or validation failure.
        """
        try:
            text = file_bytes.decode("utf-8-sig")  # strips BOM if present
        except UnicodeDecodeError:
            try:
                text = file_bytes.decode("latin-1")
            except UnicodeDecodeError as exc:
                raise AdapterError(f"Could not decode CSV file: {exc}") from exc

        reader = csv.DictReader(io.StringIO(text))

        if reader.fieldnames is None:
            raise AdapterError("CSV file appears to be empty.")

        # Normalize header names
        normalized_headers = {
            h.strip().lower(): h for h in reader.fieldnames if h
        }
        missing = REQUIRED_COLUMNS - set(normalized_headers.keys())
        if missing:
            raise AdapterError(
                f"CSV is missing required columns: {missing}. "
                f"Found: {list(normalized_headers.keys())}"
            )

        rows: list[dict] = []
        errors: list[str] = []

        for i, raw_row in enumerate(reader, start=2):
            # Re-key using normalized names
            row = {k.strip().lower(): v.strip() for k, v in raw_row.items() if k}

            raw_date = row.get("date", "").strip()
            raw_nav = row.get("nav", "").strip()

            if not raw_date and not raw_nav:
                continue  # skip blank rows

            # Parse date
            try:
                parsed_date = parse_date_flexible(raw_date)
            except ValueError as exc:
                errors.append(f"Row {i}: {exc}")
                continue

            # Parse NAV
            try:
                nav_val = float(raw_nav.replace(",", ""))
            except (ValueError, AttributeError):
                errors.append(f"Row {i}: cannot parse NAV value '{raw_nav}'")
                continue

            if nav_val <= 0:
                errors.append(
                    f"Row {i}: NAV must be positive, got {nav_val}"
                )
                continue

            rows.append({"date": parsed_date, "nav": nav_val})

        if errors and not rows:
            raise AdapterError(
                f"CSV parsing failed on all rows. First error: {errors[0]}"
            )

        if errors:
            logger.warning("CSV parse warnings: %s", "; ".join(errors[:5]))

        if not rows:
            raise AdapterError("CSV file contains no valid data rows.")

        rows.sort(key=lambda r: r["date"])
        return rows

    # DataAdapter interface methods (not used for CSV, but required by ABC)
    def fetch_price_history(
        self, identifier: str, start: date, end: date
    ) -> list[dict]:
        raise NotImplementedError("Use CsvAdapter.parse() to import CSV data.")

    def fetch_fund_metadata(self, identifier: str) -> dict:
        raise NotImplementedError("CSV adapter does not provide fund metadata.")
