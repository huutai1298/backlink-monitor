from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import Optional, List

from database import get_db, SessionLocal
from models.website import Website
from models.backlink import Backlink
from models.notification_log import NotificationLog
from schemas.website import WebsiteUpdate, WebsiteResponse
from middleware.auth import verify_token

router = APIRouter(prefix="/api/websites", tags=["websites"])


@router.get("", response_model=List[WebsiteResponse])
def list_websites(
    domain: Optional[str] = None,
    is_dead: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    query = db.query(Website)
    if domain:
        query = query.filter(Website.domain.ilike(f"%{domain}%"))
    if is_dead is not None:
        query = query.filter(Website.is_dead == is_dead)
    return query.all()


@router.put("/{website_id}", response_model=WebsiteResponse)
def update_website(
    website_id: int,
    data: WebsiteUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(website, key, value)
    db.commit()
    db.refresh(website)
    return website


@router.delete("/{website_id}", status_code=204)
def delete_website(
    website_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    # Cascade delete: remove notification_logs linked to this website's backlinks
    backlink_subquery = db.query(Backlink.id).filter(Backlink.website_id == website_id).subquery()
    db.query(NotificationLog).filter(NotificationLog.backlink_id.in_(backlink_subquery)).delete(synchronize_session=False)
    # Cascade delete: remove notification_logs linked directly to this website
    db.query(NotificationLog).filter(NotificationLog.website_id == website_id).delete(synchronize_session=False)
    # Cascade delete: remove backlinks linked to this website
    db.query(Backlink).filter(Backlink.website_id == website_id).delete(synchronize_session=False)
    # Delete the website
    db.delete(website)
    db.commit()


@router.post("/{website_id}/crawl")
async def crawl_website(
    website_id: int,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    website = db.query(Website).filter(Website.id == website_id).first()
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    domain = website.domain

    async def run_crawl():
        task_db = SessionLocal()
        try:
            from services.status_updater import update_single_domain
            await update_single_domain(domain, task_db)
        finally:
            task_db.close()

    background_tasks.add_task(run_crawl)
    return {"message": "Crawl started", "domain": domain}
