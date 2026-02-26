from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from ..database import Base


class NewsItem(Base):
    __tablename__ = "news_items"

    id           = Column(Integer, primary_key=True, index=True)
    fund_id      = Column(Integer, ForeignKey("funds.id", ondelete="CASCADE"), nullable=False)
    title        = Column(String(500), nullable=False)
    url          = Column(String(2000), nullable=False)
    source_name  = Column(String(200), nullable=True)
    published_at = Column(DateTime, nullable=True)
    summary      = Column(Text, nullable=True)
    fetched_at   = Column(DateTime, nullable=False, default=func.now())

    fund = relationship("Fund", back_populates="news_items")
