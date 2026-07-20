"""Price cache service.

Stores computed results (returns, chart series) keyed by (fund_id, cache_key).
Cache expires after CACHE_TTL_HOURS (default 24h).
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Any, Optional

from sqlalchemy.orm import Session

from ..config import get_settings
from ..models.price import PriceCache

logger = logging.getLogger(__name__)


def get_cached(db: Session, fund_id: int, cache_key: str) -> Optional[Any]:
    """Return cached payload if it exists and has not expired."""
    settings = get_settings()
    now = datetime.utcnow()
    row = (
        db.query(PriceCache)
        .filter(
            PriceCache.fund_id == fund_id,
            PriceCache.cache_key == cache_key,
        )
        .first()
    )
    if row and row.expires_at > now:
        return row.payload
    return None


def set_cached(
    db: Session,
    fund_id: int,
    cache_key: str,
    payload: Any,
    ttl_hours: Optional[int] = None,
) -> None:
    """Store a payload in the cache with a TTL."""
    settings = get_settings()
    hours = ttl_hours if ttl_hours is not None else settings.CACHE_TTL_HOURS
    now = datetime.utcnow()
    expires = now + timedelta(hours=hours)

    row = (
        db.query(PriceCache)
        .filter(PriceCache.fund_id == fund_id, PriceCache.cache_key == cache_key)
        .first()
    )
    if row:
        row.payload = payload
        row.fetched_at = now
        row.expires_at = expires
    else:
        row = PriceCache(
            fund_id=fund_id,
            cache_key=cache_key,
            payload=payload,
            fetched_at=now,
            expires_at=expires,
        )
        db.add(row)
    db.commit()


def invalidate_cache(db: Session, fund_id: int) -> int:
    """Delete all cache entries for a fund. Returns number of rows deleted."""
    count = (
        db.query(PriceCache)
        .filter(PriceCache.fund_id == fund_id)
        .delete()
    )
    db.commit()
    return count
