from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Reservation(Base):
    __tablename__ = "reservations"

    id = Column(Integer, primary_key=True, index=True)
    statut = Column(String, default="en_attente", nullable=False)
    date_reservation = Column(DateTime(timezone=True), server_default=func.now())

    evenement_id = Column(Integer, ForeignKey("evenements.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    evenement = relationship("Evenement", back_populates="reservations")
    paiement = relationship("Paiement", back_populates="reservation", uselist=False)
    billet = relationship("Billet", back_populates="reservation", uselist=False)