from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ScenarioHorizonSchema(BaseModel):
    horizon_years: int
    base_cagr: float
    bull_cagr: float
    bear_cagr: float
    sigma_annual: Optional[float] = None
    base_value_per_1000: float
    bull_value_per_1000: float
    bear_value_per_1000: float
    notes: Optional[str] = None
    generated_at: datetime


class ScenariosResponse(BaseModel):
    fund_id: int
    disclaimer: str
    projections: list[ScenarioHorizonSchema]
