from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class CustomerCreate(BaseModel):
    name: str
    telegram_group_id: Optional[str] = None
    telegram_group_url: Optional[str] = None
    note: Optional[str] = None


class CustomerUpdate(BaseModel):
    name: Optional[str] = None
    telegram_group_id: Optional[str] = None
    telegram_group_url: Optional[str] = None
    note: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerResponse(BaseModel):
    id: int
    name: str
    telegram_group_id: Optional[str] = None
    telegram_group_url: Optional[str] = None
    note: Optional[str] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
