from pydantic import BaseModel
from datetime import date, datetime
from typing import Optional


class HoldingSchema(BaseModel):
    holding_name: str
    weight: Optional[float] = None
    holding_type: Optional[str] = None
    as_of_date: Optional[date] = None

    model_config = {"from_attributes": True}


class FundSummarySchema(BaseModel):
    id: int
    ticker: Optional[str] = None
    isin: Optional[str] = None
    internal_code: Optional[str] = None
    name: str
    asset_class: Optional[str] = None
    style: Optional[str] = None
    currency: str
    is_demo: bool
    latest_nav: Optional[float] = None
    latest_date: Optional[date] = None

    model_config = {"from_attributes": True}


class FundDetailSchema(FundSummarySchema):
    objective: Optional[str] = None
    holdings: list[HoldingSchema] = []
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class FundSearchRequest(BaseModel):
    query: str


class FundSearchResponse(BaseModel):
    fund: FundSummarySchema
    created: bool
