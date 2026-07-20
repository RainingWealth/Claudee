"""Date helper utilities for fund data processing."""
from datetime import date, datetime
from dateutil.relativedelta import relativedelta


def trailing_window_start(end: date, years: int) -> date:
    """Return the target start date for a trailing return window.

    Uses relativedelta so leap years are handled correctly.
    """
    return end - relativedelta(years=years)


def parse_date_flexible(raw: str) -> date:
    """Try multiple date formats and return the first match.

    Supported formats (in priority order):
        YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY, DD-Mon-YYYY (e.g. 02-Jan-2024)
    """
    formats = [
        "%Y-%m-%d",
        "%d/%m/%Y",
        "%m/%d/%Y",
        "%d-%b-%Y",
        "%Y/%m/%d",
        "%d.%m.%Y",
    ]
    raw = raw.strip()
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: '{raw}'. Supported formats: YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY")


def is_weekend(d: date) -> bool:
    return d.weekday() >= 5  # Saturday=5, Sunday=6


def business_days_between(start: date, end: date) -> int:
    """Approximate number of business days between two dates (Mon–Fri)."""
    total = 0
    current = start
    while current <= end:
        if not is_weekend(current):
            total += 1
        current += relativedelta(days=1)
    return total
