from pydantic import BaseModel
from typing import Optional


class CsvUploadResponse(BaseModel):
    fund_id: int
    fund_name: str
    rows_imported: int
    warnings: list[str] = []


class RefreshResponse(BaseModel):
    fund_id: int
    rows_updated: int
    latest_date: Optional[str] = None
    source: str


class RefreshAllResponse(BaseModel):
    funds_refreshed: int
    errors: list[dict] = []
