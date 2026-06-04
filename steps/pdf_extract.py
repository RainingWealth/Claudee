from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

import pymupdf

from models import ExtractedData

KV_PATTERNS = [
    re.compile(r"^(.+?):\s+(.+)$"),
    re.compile(r"^(.+?)\s{2,}(.+)$"),
]


def extract_from_pdf(pdf_path: str | Path) -> ExtractedData:
    pdf_path = Path(pdf_path)
    fields: dict[str, str] = {}

    doc = pymupdf.open(str(pdf_path))

    # Try form fields first (fillable PDFs / AcroForms)
    for page in doc:
        for widget in page.widgets():
            key = widget.field_name
            value = widget.field_value
            if key and value:
                fields[_clean_key(key)] = str(value).strip()

    # Fall back to text parsing
    if not fields:
        for page in doc:
            text = page.get_text()
            for line in text.split("\n"):
                line = line.strip()
                if not line:
                    continue
                for pattern in KV_PATTERNS:
                    match = pattern.match(line)
                    if match:
                        key = _clean_key(match.group(1))
                        value = match.group(2).strip()
                        if key and value and len(key) < 50:
                            fields[key] = value
                        break

    # Extract from tables (PyMuPDF table extraction)
    if not fields:
        for page in doc:
            tabs = page.find_tables()
            for tab in tabs:
                for row in tab.extract():
                    if row and len(row) >= 2 and row[0] and row[1]:
                        key = _clean_key(str(row[0]))
                        value = str(row[1]).strip()
                        if key and value:
                            fields[key] = value

    doc.close()

    return ExtractedData(
        raw_fields=fields,
        source_file=str(pdf_path),
        extracted_at=datetime.now(timezone.utc),
    )


def _clean_key(key: str) -> str:
    key = key.strip().rstrip(":").strip()
    key = re.sub(r"\s+", "_", key)
    return key.lower()
