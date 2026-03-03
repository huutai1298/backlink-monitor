from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class BlacklistCreate(BaseModel):
    source_url: str
    href: str
    anchor_text: Optional[str] = None


class BlacklistResponse(BaseModel):
    id: int
    source_url: str
    href: str
    anchor_text: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
