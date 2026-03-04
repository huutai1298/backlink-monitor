from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List

from database import get_db
from models.backlink import Backlink
from models.customer import Customer
from models.notification_log import NotificationLog
from schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from middleware.auth import verify_token

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=List[CustomerResponse])
def list_customers(
    name: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    query = db.query(Customer)
    if name:
        query = query.filter(Customer.name.ilike(f"%{name}%"))
    if is_active is not None:
        query = query.filter(Customer.is_active == is_active)
    return query.all()


@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    data: CustomerCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    customer = Customer(**data.model_dump())
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    data: CustomerUpdate,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    db.commit()
    db.refresh(customer)
    return customer


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    backlink_ids = db.query(Backlink.id).filter(Backlink.customer_id == customer_id).subquery()
    db.query(NotificationLog).filter(NotificationLog.backlink_id.in_(backlink_ids)).delete(synchronize_session=False)

    db.query(NotificationLog).filter(NotificationLog.customer_id == customer_id).delete(synchronize_session=False)

    db.query(Backlink).filter(Backlink.customer_id == customer_id).delete(synchronize_session=False)

    db.delete(customer)
    db.commit()


@router.patch("/{customer_id}/deactivate", response_model=CustomerResponse)
def deactivate_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    customer.is_active = False
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/{customer_id}/backlinks")
def get_customer_backlinks(
    customer_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(verify_token),
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    backlinks = (
        db.query(Backlink)
        .filter(Backlink.customer_id == customer_id)
        .options(joinedload(Backlink.website))
        .all()
    )
    return [
        {
            "id": bl.id,
            "backlink_url": bl.backlink_url,
            "anchor_text": bl.anchor_text,
            "status": bl.status,
            "date_placed": bl.date_placed,
            "date_payment": bl.date_payment,
            "website_domain": bl.website.domain if bl.website else None,
            "price_monthly": bl.website.price_monthly if bl.website else None,
            "last_checked": bl.last_checked,
            "last_live_at": bl.last_live_at,
            "lost_at": bl.lost_at,
        }
        for bl in backlinks
    ]
