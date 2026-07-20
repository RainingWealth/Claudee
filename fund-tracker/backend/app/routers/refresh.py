"""Price refresh endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.fund import Fund
from ..schemas.upload import RefreshResponse, RefreshAllResponse
from ..services.fund_service import refresh_fund_prices, get_fund_with_latest_nav

router = APIRouter(prefix="/refresh", tags=["refresh"])


@router.post("/{fund_id}", response_model=RefreshResponse)
def refresh_fund(fund_id: int, db: Session = Depends(get_db)):
    """Re-fetch price history from yfinance for a single fund."""
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

    if not fund.ticker:
        raise HTTPException(
            status_code=400,
            detail="This fund has no ticker (CSV-only). Re-upload a CSV to update data.",
        )

    rows_updated = refresh_fund_prices(db, fund)
    nav_info = get_fund_with_latest_nav(db, fund)

    return RefreshResponse(
        fund_id=fund_id,
        rows_updated=rows_updated,
        latest_date=str(nav_info["latest_date"]) if nav_info["latest_date"] else None,
        source="yfinance",
    )


@router.post("/all", response_model=RefreshAllResponse)
def refresh_all(db: Session = Depends(get_db)):
    """Re-fetch price history for all funds with a ticker."""
    funds = db.query(Fund).filter(Fund.ticker.isnot(None)).all()
    refreshed = 0
    errors = []

    for fund in funds:
        try:
            refresh_fund_prices(db, fund)
            refreshed += 1
        except Exception as exc:
            errors.append({"fund_id": fund.id, "ticker": fund.ticker, "error": str(exc)})

    return RefreshAllResponse(funds_refreshed=refreshed, errors=errors)
