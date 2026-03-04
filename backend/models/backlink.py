from sqlalchemy import (
    Column, Integer, String, Boolean, Text, DateTime, Date,
    Enum, ForeignKey, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Backlink(Base):
    __tablename__ = "backlinks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    website_id = Column(Integer, ForeignKey("websites.id"), nullable=False)
    backlink_url = Column(String(500), nullable=False)
    anchor_text = Column(String(500), nullable=True)
    target_url = Column(String(2048), nullable=True)
    date_placed = Column(Date, nullable=True)
    date_payment = Column(Date, nullable=True)
    status = Column(
        Enum("pending", "live", "lost", "expired", "inactive"),
        default="pending",
        nullable=False,
    )
    last_checked = Column(DateTime, nullable=True)
    last_live_at = Column(DateTime, nullable=True)
    lost_at = Column(DateTime, nullable=True)
    inactive_notified_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    customer = relationship("Customer")
    website = relationship("Website")

    __table_args__ = (
        Index("idx_website_id", "website_id"),
        Index("idx_customer_id", "customer_id"),
        Index("idx_status", "status"),
        Index("idx_customer_status", "customer_id", "status"),
        Index("idx_date_payment", "date_payment"),
    )
