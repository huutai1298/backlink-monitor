from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class CrawlRequest(BaseModel):
    domain: str


class CrawlLinkItem(BaseModel):
    href: str
    anchor_text: Optional[str] = None


class CrawlResponse(BaseModel):
    domain: str
    new_links: List[CrawlLinkItem]
    existing_links: List[Dict[str, Any]]
    blacklisted_links: List[CrawlLinkItem]
