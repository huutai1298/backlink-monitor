from pydantic import BaseModel
from datetime import datetime
from decimal import Decimal
from typing import Optional


class WebsiteUpdate(BaseModel):
    price_monthly: Optional[Decimal] = None
    category: Optional[str] = None
    note: Optional[str] = None
    is_active: Optional[bool] = None


class WebsiteResponse(BaseModel):
    id: int
    domain: str
    price_monthly: Optional[Decimal] = None
    category: Optional[str] = None
    note: Optional[str] = None
    is_active: bool
    is_dead: bool
    dead_since: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
