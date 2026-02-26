"""Tests for the CSV upload adapter."""
import pytest
from app.adapters.csv_adapter import CsvAdapter
from app.adapters.base import AdapterError


@pytest.fixture
def adapter():
    return CsvAdapter()


class TestCsvParsing:
    def test_standard_csv(self, adapter):
        raw = b"date,nav\n2024-01-02,100.00\n2024-01-03,100.50\n"
        rows = adapter.parse(raw)
        assert len(rows) == 2
        assert rows[0]["nav"] == pytest.approx(100.00)
        assert rows[1]["nav"] == pytest.approx(100.50)

    def test_utf8_bom(self, adapter):
        """Excel sometimes exports CSV with a BOM prefix."""
        raw = b"\xef\xbb\xbfdate,nav\n2024-01-02,100.00\n"
        rows = adapter.parse(raw)
        assert len(rows) == 1
        assert rows[0]["nav"] == pytest.approx(100.00)

    def test_case_insensitive_headers(self, adapter):
        raw = b"Date,NAV\n2024-01-02,100.00\n"
        rows = adapter.parse(raw)
        assert len(rows) == 1

    def test_extra_whitespace_in_headers(self, adapter):
        raw = b" date , nav \n2024-01-02,100.00\n"
        rows = adapter.parse(raw)
        assert len(rows) == 1

    def test_date_format_ddmmyyyy(self, adapter):
        raw = b"date,nav\n02/01/2024,100.00\n"
        rows = adapter.parse(raw)
        assert rows[0]["date"].year == 2024
        assert rows[0]["date"].month == 1
        assert rows[0]["date"].day == 2

    def test_date_format_mmddyyyy(self, adapter):
        raw = b"date,nav\n01/02/2024,100.00\n"
        rows = adapter.parse(raw)
        # 01/02/2024 could be Jan 2 or Feb 1 depending on format priority
        # Our priority: DD/MM/YYYY first, so this is Feb 1
        assert rows[0]["date"].year == 2024

    def test_date_format_mon(self, adapter):
        raw = b"date,nav\n02-Jan-2024,100.00\n"
        rows = adapter.parse(raw)
        assert rows[0]["date"].year == 2024
        assert rows[0]["date"].month == 1

    def test_missing_nav_column_raises(self, adapter):
        raw = b"date,price\n2024-01-02,100.00\n"
        with pytest.raises(AdapterError, match="missing required columns"):
            adapter.parse(raw)

    def test_missing_date_column_raises(self, adapter):
        raw = b"timestamp,nav\n2024-01-02,100.00\n"
        with pytest.raises(AdapterError, match="missing required columns"):
            adapter.parse(raw)

    def test_negative_nav_raises(self, adapter):
        raw = b"date,nav\n2024-01-02,-5.00\n"
        with pytest.raises(AdapterError, match="NAV must be positive"):
            adapter.parse(raw)

    def test_zero_nav_raises(self, adapter):
        raw = b"date,nav\n2024-01-02,0.00\n"
        with pytest.raises(AdapterError, match="NAV must be positive"):
            adapter.parse(raw)

    def test_empty_file_raises(self, adapter):
        with pytest.raises(AdapterError, match="empty"):
            adapter.parse(b"")

    def test_no_data_rows_raises(self, adapter):
        raw = b"date,nav\n"
        with pytest.raises(AdapterError):
            adapter.parse(raw)

    def test_comma_in_nav_number(self, adapter):
        """European-style number like 1,234.56"""
        raw = b"date,nav\n2024-01-02,\"1,234.56\"\n"
        rows = adapter.parse(raw)
        assert len(rows) == 1
        assert rows[0]["nav"] == pytest.approx(1234.56)

    def test_rows_sorted_ascending(self, adapter):
        raw = b"date,nav\n2024-01-05,105.0\n2024-01-02,100.0\n2024-01-03,101.0\n"
        rows = adapter.parse(raw)
        dates = [r["date"] for r in rows]
        assert dates == sorted(dates)

    def test_blank_rows_skipped(self, adapter):
        raw = b"date,nav\n2024-01-02,100.00\n\n2024-01-03,101.00\n\n"
        rows = adapter.parse(raw)
        assert len(rows) == 2
