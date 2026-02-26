"""Demo mode endpoints."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..services import demo_service

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/seed")
def seed_demo(db: Session = Depends(get_db)):
    """Seed demo funds and sample price data. Idempotent."""
    seeded = demo_service.seed(db)
    return {"funds_seeded": seeded, "message": "Demo data is ready."}


@router.delete("/reset")
def reset_demo(db: Session = Depends(get_db)):
    """Remove all demo funds and their associated data."""
    deleted = demo_service.reset(db)
    return {"funds_deleted": deleted, "message": "Demo data has been removed."}
