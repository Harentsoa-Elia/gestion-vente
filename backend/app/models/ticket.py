from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, Enum
from sqlalchemy.orm import relationship
from app.database import Base
from enum import Enum as PyEnum

class TicketCategory(str, PyEnum):
    VIP = "VIP"
    ADULT = "ADULT"
    CHILD = "CHILD"
    PREVENTE = "PREVENTE"
    VENTELIVE = "VENTELIVE"
    EMIFI_SANS_PRIX =  "EMIFI_SANS_PRIX"
    EMIFI_INV_50M_AR = "EMIFI_INV_50M_AR"
    EMIFI_INV_30M_AR = "EMIFI_INV_30M_AR"
    EMIFI_INV_10M_AR = "EMIFI_INV_10M_AR"
    EMIFI_INV_7M_AR =  "EMIFI_INV_7M_AR"
    EMIFI_ANCIENS = "EMIFI_ANCIENS"


class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(String, primary_key=True, index=True, nullable=False)
    concert_id = Column(Integer, ForeignKey("concerts.id"), nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    qr_code_data = Column(String, unique=True, index=True, nullable=False)
    category = Column(Enum(TicketCategory, name="ticketcategory"), nullable=False)
    concert = relationship("Concert", back_populates="tickets")