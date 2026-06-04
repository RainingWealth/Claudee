from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ExtractedData(BaseModel):
    raw_fields: dict[str, str]
    source_file: str
    extracted_at: datetime

    def get(self, key: str, default: str = "") -> str:
        return self.raw_fields.get(key, default)

    def keys(self) -> list[str]:
        return list(self.raw_fields.keys())


class FieldMapping(BaseModel):
    pdf_key: str
    selector: str
    type: str = "text"


class LoginConfig(BaseModel):
    url: str
    username_selector: str
    password_selector: str
    submit_selector: str


class CalendarConfig(BaseModel):
    trigger_selector: str
    next_month_selector: str
    prev_month_selector: str
    month_year_selector: str
    day_selector_template: str
    date_format: str = "%Y-%m-%d"


class FormConfig(BaseModel):
    url: str
    fields: list[FieldMapping]
    submit_selector: str


class WorkflowResult(BaseModel):
    success: bool
    message: str
    extracted_data: dict[str, str] | None = None
    screenshot_path: str | None = None
    error: str | None = None
