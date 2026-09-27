from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Billet(Base):
    __tablename__ = "billets"

    id = Column(Integer, primary_key=True, index=True)
    numero_billet = Column(String, unique=True, index=True, nullable=False)
    qr_code = Column(String, unique=True, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    date_emission = Column(DateTime(timezone=True), server_default=func.now())
    # heure du passage à l'entrée (premier scan valide), None tant que le billet n'est pas utilisé
    date_scan = Column(DateTime(timezone=True), nullable=True)

    reservation_id = Column(Integer, ForeignKey("reservations.id"), unique=True, nullable=False)

    reservation = relationship("Reservation", back_populates="billet")