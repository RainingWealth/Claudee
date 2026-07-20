"""News fetching endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.fund import Fund
from ..schemas.news import NewsItemSchema, NewsRefreshResponse
from ..services.news_service import fetch_and_store_news, get_news_for_fund

router = APIRouter(prefix="/funds", tags=["news"])


@router.get("/{fund_id}/news", response_model=list[NewsItemSchema])
def get_news(
    fund_id: int,
    refresh: bool = Query(False, description="Force re-fetch from news sources"),
    db: Session = Depends(get_db),
):
    """Get latest news for a fund. Cached for 6 hours unless refresh=true."""
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

    if refresh:
        fetch_and_store_news(db, fund, force_refresh=True)

    items = get_news_for_fund(db, fund_id)
    return [
        NewsItemSchema(
            id=item.id,
            title=item.title,
            url=item.url,
            source_name=item.source_name,
            published_at=item.published_at,
            summary=item.summary,
            fetched_at=item.fetched_at,
        )
        for item in items
    ]


@router.post("/{fund_id}/news/refresh", response_model=NewsRefreshResponse)
def refresh_news(fund_id: int, db: Session = Depends(get_db)):
    """Force re-fetch news from all configured sources."""
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

    total, new_items = fetch_and_store_news(db, fund, force_refresh=True)
    return NewsRefreshResponse(fetched=total, new_items=new_items)
