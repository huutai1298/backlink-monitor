from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime, DECIMAL
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base


class Website(Base):
    __tablename__ = "websites"

    id = Column(Integer, primary_key=True, autoincrement=True)
    domain = Column(String(255), nullable=False, unique=True)
    price_monthly = Column(DECIMAL(15, 2), default=0)
    category = Column(String(100), nullable=True)
    note = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    is_dead = Column(Boolean, default=False)
    dead_since = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    blacklisted_links = relationship("BlacklistedLink", back_populates="website")
