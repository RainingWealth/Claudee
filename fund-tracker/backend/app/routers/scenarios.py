"""Scenario projection endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import DISCLAIMER_TEXT
from ..database import get_db
from ..models.fund import Fund
from ..models.scenario import ScenarioProjection
from ..schemas.scenario import ScenariosResponse, ScenarioHorizonSchema
from ..services.scenario_service import compute_scenarios, persist_scenarios
from ..services.audit_service import write_audit
from ..utils.math_utils import projected_value

router = APIRouter(prefix="/funds", tags=["scenarios"])


@router.get("/{fund_id}/scenarios", response_model=ScenariosResponse)
def get_scenarios(
    fund_id: int,
    refresh: bool = Query(False, description="Recompute scenarios from latest data"),
    db: Session = Depends(get_db),
):
    """Get base/bull/bear scenario projections for 1Y, 3Y, and 5Y horizons."""
    fund = db.query(Fund).filter(Fund.id == fund_id).first()
    if not fund:
        raise HTTPException(status_code=404, detail=f"Fund {fund_id} not found")

    # Check for existing scenarios
    existing = (
        db.query(ScenarioProjection)
        .filter(ScenarioProjection.fund_id == fund_id)
        .all()
    )

    if not existing or refresh:
        results = compute_scenarios(db, fund_id)
        if not results:
            raise HTTPException(
                status_code=422,
                detail=(
                    "Insufficient price history to compute projections. "
                    "At least 2 years of daily data are recommended."
                ),
            )
        records = persist_scenarios(db, fund_id, results)
        write_audit(
            db,
            event_type="scenario_generate",
            fund_id=fund_id,
            detail={"horizons": [r.horizon_years for r in results]},
            status="success",
        )
        existing = records

    projections = []
    for rec in sorted(existing, key=lambda r: r.horizon_years):
        projections.append(
            ScenarioHorizonSchema(
                horizon_years=rec.horizon_years,
                base_cagr=rec.base_cagr,
                bull_cagr=rec.bull_cagr,
                bear_cagr=rec.bear_cagr,
                sigma_annual=rec.sigma_annual,
                base_value_per_1000=projected_value(1000.0, rec.base_cagr, rec.horizon_years),
                bull_value_per_1000=projected_value(1000.0, rec.bull_cagr, rec.horizon_years),
                bear_value_per_1000=projected_value(1000.0, rec.bear_cagr, rec.horizon_years),
                notes=rec.notes,
                generated_at=rec.generated_at,
            )
        )

    return ScenariosResponse(
        fund_id=fund_id,
        disclaimer=DISCLAIMER_TEXT,
        projections=projections,
    )
