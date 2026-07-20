from sqlalchemy import Column, Integer, Float, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class ScenarioProjection(Base):
    __tablename__ = "scenario_projections"

    id             = Column(Integer, primary_key=True, index=True)
    fund_id        = Column(Integer, ForeignKey("funds.id", ondelete="CASCADE"), nullable=False)
    generated_at   = Column(DateTime, nullable=False, default=func.now())
    horizon_years  = Column(Integer, nullable=False)   # 1, 3, or 5
    base_cagr      = Column(Float, nullable=False)
    bull_cagr      = Column(Float, nullable=False)
    bear_cagr      = Column(Float, nullable=False)
    sigma_annual   = Column(Float, nullable=True)
    notes          = Column(Text, nullable=True)
    disclaimer     = Column(Text, nullable=False)

    fund = relationship("Fund", back_populates="scenarios")
