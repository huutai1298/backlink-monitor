from datetime import date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from typing import List

from database import get_db
from models.backlink import Backlink
from models.website import Website
from middleware.auth import verify_token

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/stats")
def dashboard_stats(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    statuses = ["live", "lost", "pending", "expired", "inactive"]
    counts = {}
    for s in statuses:
        counts[s] = db.query(Backlink).filter(Backlink.status == s).count()

    monthly_revenue = (
        db.query(func.sum(Website.price_monthly))
        .join(Backlink, Backlink.website_id == Website.id)
        .filter(Backlink.status == "live")
        .scalar()
        or 0
    )

    return {
        "live": counts["live"],
        "lost": counts["lost"],
        "pending": counts["pending"],
        "expired": counts["expired"],
        "inactive": counts["inactive"],
        "monthly_revenue": float(monthly_revenue),
    }


@router.get("/expiring")
def dashboard_expiring(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    cutoff = date.today() + timedelta(days=7)
    backlinks = (
        db.query(Backlink)
        .filter(
            Backlink.date_payment <= cutoff,
            Backlink.status.in_(["live", "pending"]),
        )
        .options(joinedload(Backlink.customer), joinedload(Backlink.website))
        .all()
    )
    return [
        {
            "id": bl.id,
            "customer_name": bl.customer.name if bl.customer else None,
            "domain": bl.website.domain if bl.website else None,
            "anchor_text": bl.anchor_text,
            "date_payment": bl.date_payment,
            "status": bl.status,
        }
        for bl in backlinks
    ]


@router.get("/inactive-alive")
def dashboard_inactive_alive(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    backlinks = (
        db.query(Backlink)
        .filter(Backlink.status == "inactive")
        .options(joinedload(Backlink.customer), joinedload(Backlink.website))
        .all()
    )
    return [
        {
            "id": bl.id,
            "customer_name": bl.customer.name if bl.customer else None,
            "domain": bl.website.domain if bl.website else None,
            "anchor_text": bl.anchor_text,
            "date_payment": bl.date_payment,
            "status": bl.status,
        }
        for bl in backlinks
    ]


@router.get("/dead-websites")
def dashboard_dead_websites(
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    rows = (
        db.query(Website, func.count(Backlink.id).label("backlink_count"))
        .outerjoin(Backlink, Backlink.website_id == Website.id)
        .filter(Website.is_dead == True)
        .group_by(Website.id)
        .all()
    )
    return [
        {
            "id": w.id,
            "domain": w.domain,
            "dead_since": w.dead_since,
            "affected_backlinks": count,
        }
        for w, count in rows
    ]
