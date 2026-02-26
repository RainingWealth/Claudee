"""Audit log service for compliance tracking."""
import logging
from datetime import datetime
from typing import Any, Optional

from sqlalchemy.orm import Session

from ..models.audit import AuditLog

logger = logging.getLogger(__name__)


def write_audit(
    db: Session,
    event_type: str,
    status: str,
    fund_id: Optional[int] = None,
    detail: Optional[dict[str, Any]] = None,
    error_msg: Optional[str] = None,
) -> AuditLog:
    """Write an entry to the audit log.

    Args:
        db: database session
        event_type: one of "price_refresh", "csv_upload", "news_fetch",
                    "scenario_generate", "fund_search", "demo_seed"
        status: "success", "partial", or "error"
        fund_id: optional associated fund ID
        detail: arbitrary JSON-serialisable dict
        error_msg: error description if status == "error"

    Returns:
        The created AuditLog record (already committed).
    """
    entry = AuditLog(
        event_type=event_type,
        fund_id=fund_id,
        detail=detail or {},
        performed_at=datetime.utcnow(),
        status=status,
        error_msg=error_msg,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    log_level = logging.WARNING if status == "error" else logging.INFO
    logger.log(
        log_level,
        "AUDIT [%s] fund_id=%s status=%s detail=%s error=%s",
        event_type,
        fund_id,
        status,
        detail,
        error_msg,
    )
    return entry
