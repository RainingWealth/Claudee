"""Return calculation and chart data endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.fund import Fund
from ..schemas.returns import ReturnsResponse, ReturnWindowSchema, ChartResponse, ChartPoint
from ..services.returns_service import get_returns_for_fund, get_chart_series

router = APIRouter(prefix="/funds", tags=["returns"])


@router.get("/{fund_id}/returns", response_model=ReturnsResponse)
def get_returns(fund_id: int, db: Session = Depends(get_db)):
    """Compute trailing 2Y, 3Y, 5Y returns for a fund."""
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

    result = get_returns_for_fund(db, fund_id)

    return ReturnsResponse(
        fund_id=fund_id,
        latest_nav=result.latest_nav,
        latest_date=result.latest_date,
        windows=[
            ReturnWindowSchema(
                label=w.label,
                years=w.years,
                start_date=w.start_date,
                end_date=w.end_date,
                start_nav=w.start_nav,
                end_nav=w.end_nav,
                cumulative_return=w.cumulative_return,
                cagr=w.cagr,
                data_complete=w.data_complete,
                missing_days=w.missing_days,
                warning=w.warning,
            )
            for w in result.windows
        ],
    )


@router.get("/{fund_id}/chart", response_model=ChartResponse)
def get_chart(
    fund_id: int,
    period: str = Query("1y", pattern="^(1y|3y|5y)$"),
    db: Session = Depends(get_db),
):
    """Return daily NAV series for charting over 1Y, 3Y, or 5Y."""
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

    series = get_chart_series(db, fund_id, period)

    return ChartResponse(
        fund_id=fund_id,
        period=period,
        series=[ChartPoint(date=d, nav=n) for d, n in series],
    )
