from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Optional, List

from database import get_db
from models.notification_log import NotificationLog
from models.customer import Customer
from models.website import Website
from schemas.log import LogResponse
from middleware.auth import verify_token

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=List[LogResponse])
def list_logs(
    customer_id: Optional[int] = None,
    type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    query = db.query(NotificationLog)
    if customer_id is not None:
        query = query.filter(NotificationLog.customer_id == customer_id)
    if type:
        query = query.filter(NotificationLog.type == type)
    if date_from:
        query = query.filter(NotificationLog.sent_at >= date_from)
    if date_to:
        query = query.filter(NotificationLog.sent_at <= date_to)

    offset = (page - 1) * limit
    logs = query.order_by(NotificationLog.sent_at.desc()).offset(offset).limit(limit).all()

    # Bulk-load customers and websites to avoid N+1 queries
    customer_ids = {log.customer_id for log in logs if log.customer_id}
    website_ids = {log.website_id for log in logs if log.website_id}

    customers = {
        c.id: c.name
        for c in db.query(Customer.id, Customer.name).filter(Customer.id.in_(customer_ids)).all()
    } if customer_ids else {}
    websites = {
        w.id: w.domain
        for w in db.query(Website.id, Website.domain).filter(Website.id.in_(website_ids)).all()
    } if website_ids else {}

    return [
        LogResponse(
            id=log.id,
            backlink_id=log.backlink_id,
            website_id=log.website_id,
            customer_id=log.customer_id,
            type=log.type,
            message=log.message,
            sent_at=log.sent_at,
            created_at=log.created_at,
            customer_name=customers.get(log.customer_id),
            website_domain=websites.get(log.website_id),
        )
        for log in logs
    ]
