from sqlalchemy import (
    Column, Integer, String, Text, Boolean, Float, Date,
    DateTime, ForeignKey, func
)
from sqlalchemy.orm import relationship
from ..database import Base


class Fund(Base):
    __tablename__ = "funds"

    id            = Column(Integer, primary_key=True, index=True)
    ticker        = Column(String(20), unique=True, nullable=True, index=True)
    isin          = Column(String(12), unique=True, nullable=True, index=True)
    internal_code = Column(String(50), unique=True, nullable=True, index=True)
    name          = Column(String(200), nullable=False)
    asset_class   = Column(String(50), nullable=True)
    objective     = Column(Text, nullable=True)
    style         = Column(String(100), nullable=True)
    currency      = Column(String(3), default="USD")
    is_demo       = Column(Boolean, default=False, nullable=False)
    created_at    = Column(DateTime, default=func.now())
    updated_at    = Column(DateTime, default=func.now(), onupdate=func.now())

    price_history = relationship("PriceHistory", back_populates="fund",
                                  cascade="all, delete-orphan")
    price_caches  = relationship("PriceCache", back_populates="fund",
                                  cascade="all, delete-orphan")
    news_items    = relationship("NewsItem", back_populates="fund",
                                  cascade="all, delete-orphan")
    scenarios     = relationship("ScenarioProjection", back_populates="fund",
                                  cascade="all, delete-orphan")
    holdings      = relationship("FundHolding", back_populates="fund",
                                  cascade="all, delete-orphan")


class FundHolding(Base):
    __tablename__ = "fund_holdings"

    id           = Column(Integer, primary_key=True, index=True)
    fund_id      = Column(Integer, ForeignKey("funds.id", ondelete="CASCADE"), nullable=False)
    holding_name = Column(String(200), nullable=False)
    weight       = Column(Float, nullable=True)   # decimal, e.g. 0.0762 = 7.62%
    holding_type = Column(String(20), nullable=True)  # "equity", "sector", "country"
    as_of_date   = Column(Date, nullable=True)

    fund = relationship("Fund", back_populates="holdings")
