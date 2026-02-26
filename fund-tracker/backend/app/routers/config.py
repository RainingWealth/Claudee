"""Config/meta endpoints."""
from fastapi import APIRouter
from ..config import DISCLAIMER_TEXT

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/disclaimer")
def get_disclaimer():
    """Return the current disclaimer text (for frontend to load dynamically)."""
    return {"disclaimer": DISCLAIMER_TEXT}
