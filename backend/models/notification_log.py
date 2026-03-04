from sqlalchemy import Column, Integer, BigInteger, String, Text, DateTime, Enum, ForeignKey
from sqlalchemy.sql import func
from database import Base


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    backlink_id = Column(Integer, ForeignKey("backlinks.id"), nullable=True)
    website_id = Column(Integer, ForeignKey("websites.id"), nullable=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=True)
    type = Column(
        Enum("lost", "live", "inactive_still_live", "website_die", "website_alive", "command_reply"),
        nullable=False,
    )
    message = Column(Text, nullable=False)
    sent_at = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    telegram_message_id = Column(BigInteger, nullable=True)
    telegram_chat_id = Column(String(64), nullable=True)
