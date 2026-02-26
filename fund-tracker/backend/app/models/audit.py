from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, func
from ..database import Base


class AuditLog(Base):
    __tablename__ = "audit_log"

    id           = Column(Integer, primary_key=True, index=True)
    event_type   = Column(String(50), nullable=False)  # "price_refresh", "csv_upload", etc.
    fund_id      = Column(Integer, ForeignKey("funds.id", ondelete="SET NULL"), nullable=True)
    detail       = Column(JSON, nullable=True)
    performed_at = Column(DateTime, nullable=False, default=func.now())
    status       = Column(String(20), nullable=False)  # "success", "partial", "error"
    error_msg    = Column(Text, nullable=True)
