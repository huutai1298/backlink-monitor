from fastapi import APIRouter, Depends, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from database import get_db, SessionLocal
from models.website import Website
from models.backlink import Backlink
from models.blacklisted_link import BlacklistedLink
from schemas.crawl import CrawlRequest, CrawlResponse, CrawlLinkItem
from middleware.auth import verify_token

router = APIRouter(prefix="/api/crawl", tags=["crawl"])


@router.post("", response_model=CrawlResponse)
def crawl(
    data: CrawlRequest,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    from urllib.parse import urlparse
    from services.crawler import crawl_domain as do_crawl, _normalise_domain as normalise

    # Normalize: strip protocol and path; www is kept as-is per user input
    raw = data.domain.strip()
    if raw.startswith(("http://", "https://")):
        raw = urlparse(raw).netloc or raw
    else:
        raw = raw.split('/')[0]  # strip any path for non-protocol inputs
    domain = normalise(raw)

    result = do_crawl(domain)

    link_details = result.get("link_details", [])
    crawled_hrefs = {item["href"] for item in link_details}

    # Get existing backlinks for this domain
    website = db.query(Website).filter(Website.domain == domain).first()
    existing_hrefs: set = set()
    existing_links: List[dict] = []

    if website:
        backlinks = db.query(Backlink).filter(Backlink.website_id == website.id).all()
        for bl in backlinks:
            existing_hrefs.add(bl.backlink_url)
            existing_links.append(
                {
                    "href": bl.backlink_url,
                    "anchor_text": bl.anchor_text,
                    "status": bl.status,
                    "customer_name": bl.customer.name if bl.customer else None,
                }
            )

    # Get blacklisted hrefs for this domain
    blacklisted_records = (
        db.query(BlacklistedLink)
        .join(BlacklistedLink.website)
        .filter(
            BlacklistedLink.is_active == True,
            Website.domain == domain,
        )
        .all()
    )
    blacklisted_hrefs = {bl.blacklist_url for bl in blacklisted_records}

    new_links: List[CrawlLinkItem] = []
    blacklisted_links: List[CrawlLinkItem] = []

    for item in link_details:
        href = item["href"]
        anchor = item.get("anchor_text")
        if href in existing_hrefs:
            continue
        if href in blacklisted_hrefs:
            blacklisted_links.append(CrawlLinkItem(href=href, anchor_text=anchor))
        else:
            new_links.append(CrawlLinkItem(href=href, anchor_text=anchor))

    return CrawlResponse(
        domain=domain,
        new_links=new_links,
        existing_links=existing_links,
        blacklisted_links=blacklisted_links,
    )


@router.post("/all")
async def crawl_all(
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    total = db.query(Website).filter(Website.is_active == True).count()

    async def run_crawl():
        task_db = SessionLocal()
        try:
            from services.status_updater import update_all_domains
            await update_all_domains(task_db)
        finally:
            task_db.close()

    background_tasks.add_task(run_crawl)
    return {"message": "Crawl started", "total_domains": total}
