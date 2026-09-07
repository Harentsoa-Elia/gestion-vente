from sqlalchemy import Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Paiement(Base):
    __tablename__ = "paiements"

    id = Column(Integer, primary_key=True, index=True)
    montant = Column(Float, nullable=False)
    statut_paiement = Column(String, default="en_attente", nullable=False)
    mode_paiement = Column(String, default="simulation", nullable=False)
    date_paiement = Column(DateTime(timezone=True), nullable=True)

    reservation_id = Column(Integer, ForeignKey("reservations.id"), unique=True, nullable=False)

    reservation = relationship("Reservation", back_populates="paiement")