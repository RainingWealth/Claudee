from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class NewsItemSchema(BaseModel):
    id: int
    title: str
    url: str
    source_name: Optional[str] = None
    published_at: Optional[datetime] = None
    summary: Optional[str] = None
    fetched_at: datetime

    model_config = {"from_attributes": True}


class NewsRefreshResponse(BaseModel):
    fetched: int
    new_items: int
