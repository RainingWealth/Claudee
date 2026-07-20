from sqlalchemy import (
    Column, Integer, String, Date, DateTime, ForeignKey,
    Numeric, UniqueConstraint, Index, JSON, func
)
from sqlalchemy.orm import relationship
from ..database import Base


class PriceHistory(Base):
    __tablename__ = "price_history"
    __table_args__ = (
        UniqueConstraint("fund_id", "price_date", name="uq_fund_date"),
        Index("ix_price_fund_date", "fund_id", "price_date"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    fund_id    = Column(Integer, ForeignKey("funds.id", ondelete="CASCADE"), nullable=False)
    price_date = Column(Date, nullable=False)
    nav        = Column(Numeric(18, 6), nullable=False)
    source     = Column(String(20), nullable=False)  # "yfinance", "csv", "morningstar"

    fund = relationship("Fund", back_populates="price_history")


class PriceCache(Base):
    __tablename__ = "price_cache"
    __table_args__ = (
        UniqueConstraint("fund_id", "cache_key", name="uq_fund_cache_key"),
    )

    id         = Column(Integer, primary_key=True, index=True)
    fund_id    = Column(Integer, ForeignKey("funds.id", ondelete="CASCADE"), nullable=False)
    cache_key  = Column(String(100), nullable=False)
    payload    = Column(JSON, nullable=False)
    fetched_at = Column(DateTime, nullable=False, default=func.now())
    expires_at = Column(DateTime, nullable=False)

    fund = relationship("Fund", back_populates="price_caches")
