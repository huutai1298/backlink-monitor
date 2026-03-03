from datetime import date
from dateutil.relativedelta import relativedelta
from urllib.parse import urlparse
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional, List

from database import get_db
from models.backlink import Backlink
from models.website import Website
from schemas.backlink import BacklinkBulkCreate, BacklinkUpdate, BacklinkResponse
from middleware.auth import verify_token

router = APIRouter(prefix="/api/backlinks", tags=["backlinks"])


def _extract_domain(url: str) -> str:
    parsed = urlparse(url)
    netloc = parsed.netloc.lower().split(":")[0]
    if netloc.startswith("www."):
        netloc = netloc[4:]
    return netloc


def _to_response(bl: Backlink) -> dict:
    return {
        "id": bl.id,
        "customer_id": bl.customer_id,
        "website_id": bl.website_id,
        "source_href": bl.source_href,
        "anchor_text": bl.anchor_text,
        "target_url": bl.target_url,
        "date_placed": bl.date_placed,
        "date_payment": bl.date_payment,
        "status": bl.status,
        "last_checked": bl.last_checked,
        "last_live_at": bl.last_live_at,
        "lost_at": bl.lost_at,
        "created_at": bl.created_at,
        "updated_at": bl.updated_at,
        "customer_name": bl.customer.name if bl.customer else None,
        "website_domain": bl.website.domain if bl.website else None,
    }


@router.get("", response_model=List[BacklinkResponse])
def list_backlinks(
    customer_id: Optional[int] = None,
    status_filter: Optional[str] = None,
    domain: Optional[str] = None,
    keyword: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    query = db.query(Backlink)
    if customer_id is not None:
        query = query.filter(Backlink.customer_id == customer_id)
    if status_filter:
        query = query.filter(Backlink.status == status_filter)
    if domain:
        query = query.join(Backlink.website).filter(
            Website.domain.ilike(f"%{domain}%")
        )
    if keyword:
        query = query.filter(
            Backlink.source_href.ilike(f"%{keyword}%")
            | Backlink.anchor_text.ilike(f"%{keyword}%")
        )
    offset = (page - 1) * limit
    backlinks = query.offset(offset).limit(limit).all()
    return [_to_response(bl) for bl in backlinks]


@router.post("/bulk", response_model=List[BacklinkResponse], status_code=status.HTTP_201_CREATED)
def bulk_create_backlinks(
    data: BacklinkBulkCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    today = date.today()
    payment_date = today + relativedelta(months=1)
    created = []

    for item in data.items:
        domain = _extract_domain(item.source_href)
        website = db.query(Website).filter(Website.domain == domain).first()
        if not website:
            website = Website(domain=domain)
            db.add(website)
            db.flush()

        bl = Backlink(
            customer_id=item.customer_id,
            website_id=website.id,
            source_href=item.source_href,
            anchor_text=item.anchor_text,
            target_url=item.target_url,
            date_placed=today,
            date_payment=payment_date,
            status="pending",
        )
        db.add(bl)
        db.flush()
        created.append(bl)

    db.commit()
    for bl in created:
        db.refresh(bl)
    return [_to_response(bl) for bl in created]


@router.put("/{backlink_id}", response_model=BacklinkResponse)
def update_backlink(
    backlink_id: int,
    data: BacklinkUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    bl = db.query(Backlink).filter(Backlink.id == backlink_id).first()
    if not bl:
        raise HTTPException(status_code=404, detail="Backlink not found")

    if data.customer_id is not None:
        bl.customer_id = data.customer_id
    if data.date_payment is not None:
        bl.date_payment = data.date_payment
    if data.price is not None:
        website = db.query(Website).filter(Website.id == bl.website_id).first()
        if website:
            website.price_monthly = data.price

    db.commit()
    db.refresh(bl)
    return _to_response(bl)


@router.patch("/{backlink_id}/inactive", response_model=BacklinkResponse)
def set_inactive(
    backlink_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    bl = db.query(Backlink).filter(Backlink.id == backlink_id).first()
    if not bl:
        raise HTTPException(status_code=404, detail="Backlink not found")
    bl.status = "inactive"
    db.commit()
    db.refresh(bl)
    return _to_response(bl)


@router.patch("/{backlink_id}/expired", response_model=BacklinkResponse)
def set_expired(
    backlink_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    bl = db.query(Backlink).filter(Backlink.id == backlink_id).first()
    if not bl:
        raise HTTPException(status_code=404, detail="Backlink not found")
    bl.status = "expired"
    db.commit()
    db.refresh(bl)
    return _to_response(bl)


@router.delete("/{backlink_id}", status_code=204)
def delete_backlink(
    backlink_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    bl = db.query(Backlink).filter(Backlink.id == backlink_id).first()
    if not bl:
        raise HTTPException(status_code=404, detail="Backlink not found")
    db.delete(bl)
    db.commit()
