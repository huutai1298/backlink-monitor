from pydantic import BaseModel
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, List


class BacklinkCreate(BaseModel):
    customer_id: int
    domain: str
    backlink_url: str
    anchor_text: Optional[str] = None


class BacklinkBulkCreate(BaseModel):
    items: List[BacklinkCreate]


class BacklinkUpdate(BaseModel):
    customer_id: Optional[int] = None
    price: Optional[Decimal] = None  # maps to websites.price_monthly
    date_payment: Optional[date] = None


class BacklinkResponse(BaseModel):
    id: int
    customer_id: int
    website_id: int
    backlink_url: str
    anchor_text: Optional[str] = None
    date_placed: Optional[date] = None
    date_payment: Optional[date] = None
    status: str
    last_checked: Optional[datetime] = None
    last_live_at: Optional[datetime] = None
    lost_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    website_domain: Optional[str] = None

    model_config = {"from_attributes": True}
