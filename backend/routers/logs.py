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

    result = []
    for log in logs:
        customer_name = None
        website_domain = None
        if log.customer_id:
            customer = db.query(Customer).filter(Customer.id == log.customer_id).first()
            if customer:
                customer_name = customer.name
        if log.website_id:
            website = db.query(Website).filter(Website.id == log.website_id).first()
            if website:
                website_domain = website.domain
        result.append(
            LogResponse(
                id=log.id,
                backlink_id=log.backlink_id,
                website_id=log.website_id,
                customer_id=log.customer_id,
                type=log.type,
                message=log.message,
                sent_at=log.sent_at,
                created_at=log.created_at,
                customer_name=customer_name,
                website_domain=website_domain,
            )
        )
    return result
