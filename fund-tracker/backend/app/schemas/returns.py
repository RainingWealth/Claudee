from pydantic import BaseModel
from datetime import date
from typing import Optional


class ReturnWindowSchema(BaseModel):
    label: str              # "2Y", "3Y", "5Y"
    years: int
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    start_nav: Optional[float] = None
    end_nav: Optional[float] = None
    cumulative_return: Optional[float] = None
    cagr: Optional[float] = None
    data_complete: bool = True
    missing_days: int = 0
    warning: Optional[str] = None


class ReturnsResponse(BaseModel):
    fund_id: int
    latest_nav: Optional[float] = None
    latest_date: Optional[date] = None
    windows: list[ReturnWindowSchema]


class ChartPoint(BaseModel):
    date: date
    nav: float


class ChartResponse(BaseModel):
    fund_id: int
    period: str
    series: list[ChartPoint]
