from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BlacklistCreate(BaseModel):
    domain: str          # changed from website_id: int
    blacklist_url: str
    anchor_text: Optional[str] = None


class BlacklistResponse(BaseModel):
    id: int
    website_id: int
    blacklist_url: str
    anchor_text: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    website_domain: Optional[str] = None

    model_config = {"from_attributes": True}