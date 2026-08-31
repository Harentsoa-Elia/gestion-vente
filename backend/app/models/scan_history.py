from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, func
from app.database import Base

class ScanHistory(Base):
    __tablename__ = "scan_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, nullable=False)
    ticket_id = Column(String, nullable=False)
    concert_id = Column(Integer, ForeignKey("concerts.id"), nullable=False)
    concert_title = Column(String, nullable=True)
    category = Column(String, nullable=True)
    is_valid = Column(Boolean, default=False)
    message = Column(String, nullable=True)
    phone_brand = Column(String, nullable=True)
    phone_model = Column(String, nullable=True)
    ip_address = Column(String, nullable=True)
    scanned_at = Column(DateTime(timezone=True), server_default=func.now())