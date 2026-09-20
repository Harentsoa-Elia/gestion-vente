from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    organisateur_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    message = Column(String, nullable=False)
    lu = Column(Boolean, default=False, nullable=False, index=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())

    # Reference optionnelle vers la reservation a l'origine de la notification,
    # pour pouvoir plus tard faire un lien direct depuis le front.
    reservation_id = Column(Integer, ForeignKey("reservations.id"), nullable=True)

    organisateur = relationship("User")
    reservation = relationship("Reservation")