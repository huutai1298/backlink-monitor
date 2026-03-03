from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class LogResponse(BaseModel):
    id: int
    backlink_id: Optional[int] = None
    website_id: Optional[int] = None
    customer_id: Optional[int] = None
    type: str
    message: str
    sent_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    customer_name: Optional[str] = None
    website_domain: Optional[str] = None

    model_config = {"from_attributes": True}
