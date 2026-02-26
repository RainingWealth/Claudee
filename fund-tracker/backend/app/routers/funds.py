"""Fund search, list, detail, and delete endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.fund import Fund
from ..schemas.fund import (
    FundSearchRequest, FundSearchResponse, FundSummarySchema, FundDetailSchema
)
from ..services.fund_service import (
    resolve_and_create_fund, get_fund_with_latest_nav, IdentifierNotFoundError
)
from ..adapters.base import AdapterError

router = APIRouter(prefix="/funds", tags=["funds"])


def _fund_to_summary(fund: Fund, db: Session) -> FundSummarySchema:
    nav_info = get_fund_with_latest_nav(db, fund)
    return FundSummarySchema(
        id=fund.id,
        ticker=fund.ticker,
        isin=fund.isin,
        internal_code=fund.internal_code,
        name=fund.name,
        asset_class=fund.asset_class,
        style=fund.style,
        currency=fund.currency,
        is_demo=fund.is_demo,
        latest_nav=nav_info["latest_nav"],
        latest_date=nav_info["latest_date"],
    )


@router.post("/search", response_model=FundSearchResponse)
def search_fund(request: FundSearchRequest, db: Session = Depends(get_db)):
    """Resolve a ticker, ISIN, or internal code and create the fund if new."""
    try:
        fund, created = resolve_and_create_fund(db, request.query)
    except IdentifierNotFoundError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except AdapterError as exc:
        raise HTTPException(status_code=502, detail=f"Data provider error: {exc}")

    return FundSearchResponse(
        fund=_fund_to_summary(fund, db),
        created=created,
    )


@router.get("", response_model=list[FundSummarySchema])
def list_funds(
    demo: bool = Query(None, description="Filter by demo status"),
    db: Session = Depends(get_db),
):
    """List all funds, optionally filtered by demo status."""
    query = db.query(Fund)
    if demo is not None:
        query = query.filter(Fund.is_demo == demo)
    funds = query.order_by(Fund.name).all()
    return [_fund_to_summary(f, db) for f in funds]


@router.get("/{fund_id}", response_model=FundDetailSchema)
def get_fund(fund_id: int, db: Session = Depends(get_db)):
    """Get full fund details including holdings."""
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

    nav_info = get_fund_with_latest_nav(db, fund)
    from ..schemas.fund import HoldingSchema
    return FundDetailSchema(
        id=fund.id,
        ticker=fund.ticker,
        isin=fund.isin,
        internal_code=fund.internal_code,
        name=fund.name,
        asset_class=fund.asset_class,
        style=fund.style,
        currency=fund.currency,
        is_demo=fund.is_demo,
        objective=fund.objective,
        latest_nav=nav_info["latest_nav"],
        latest_date=nav_info["latest_date"],
        holdings=[
            HoldingSchema(
                holding_name=h.holding_name,
                weight=h.weight,
                holding_type=h.holding_type,
                as_of_date=h.as_of_date,
            )
            for h in sorted(fund.holdings, key=lambda h: (h.weight or 0), reverse=True)[:10]
        ],
        created_at=fund.created_at,
        updated_at=fund.updated_at,
    )


@router.delete("/{fund_id}", status_code=204)
def delete_fund(fund_id: int, db: Session = Depends(get_db)):
    """Delete a fund and all associated data."""
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

    if fund.is_demo:
        raise HTTPException(
            status_code=400,
            detail="Demo funds cannot be deleted individually. Use DELETE /demo/reset instead.",
        )

    db.delete(fund)
    db.commit()
