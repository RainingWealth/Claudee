"""CSV upload endpoints."""
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..adapters.base import AdapterError
from ..adapters.csv_adapter import CsvAdapter
from ..config import get_settings
from ..database import get_db
from ..models.fund import Fund
from ..models.price import PriceHistory
from ..schemas.upload import CsvUploadResponse
from ..services.audit_service import write_audit
from ..services.cache_service import invalidate_cache

router = APIRouter(prefix="/upload", tags=["upload"])

CSV_TEMPLATE_CONTENT = "date,nav\n2024-01-02,100.00\n2024-01-03,100.50\n"


@router.post("/csv", response_model=CsvUploadResponse)
async def upload_csv(
    file: UploadFile = File(..., description="CSV file with date and nav columns"),
    fund_name: str = Form(..., description="Name of the fund"),
    internal_code: Optional[str] = Form(None, description="Optional internal identifier"),
    db: Session = Depends(get_db),
):
    """Upload a CSV file with NAV history for an unlisted or private fund."""
    settings = get_settings()

    # Size check
    content = await file.read()
    max_bytes = settings.MAX_CSV_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_CSV_SIZE_MB} MB.",
        )

    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv file.")

    # Parse CSV
    adapter = CsvAdapter()
    try:
        rows = adapter.parse(content)
    except AdapterError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    # Find or create fund
    fund = None
    if internal_code:
        fund = db.query(Fund).filter(Fund.internal_code == internal_code).first()

    if fund is None:
        fund = Fund(
            name=fund_name,
            internal_code=internal_code,
            currency="USD",
            is_demo=False,
        )
        db.add(fund)
        db.flush()

    # Import rows (upsert)
    existing_dates = {
        r.price_date
        for r in db.query(PriceHistory.price_date)
        .filter(PriceHistory.fund_id == fund.id)
        .all()
    }

    imported = 0
    for row in rows:
        if row["date"] in existing_dates:
            continue
        db.add(PriceHistory(
            fund_id=fund.id,
            price_date=row["date"],
            nav=row["nav"],
            source="csv",
        ))
        imported += 1

    db.commit()
    invalidate_cache(db, fund.id)

    write_audit(
        db,
        event_type="csv_upload",
        fund_id=fund.id,
        detail={
            "filename": file.filename,
            "rows_total": len(rows),
            "rows_imported": imported,
        },
        status="success",
    )

    return CsvUploadResponse(
        fund_id=fund.id,
        fund_name=fund.name,
        rows_imported=imported,
        warnings=[],
    )


@router.get("/template")
def download_template():
    """Download a blank CSV template with the required format."""
    return StreamingResponse(
        io.BytesIO(CSV_TEMPLATE_CONTENT.encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=nav_template.csv"},
    )
