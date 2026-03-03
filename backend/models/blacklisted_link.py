from sqlalchemy import Column, Integer, String, Boolean, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class BlacklistedLink(Base):
    __tablename__ = "blacklisted_links"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_url = Column(String(255), nullable=False)
    href = Column(String(2048), nullable=False)
    anchor_text = Column(String(500), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
