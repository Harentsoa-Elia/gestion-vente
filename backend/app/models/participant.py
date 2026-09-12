from sqlalchemy import Column, Integer, String, Date, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Participant(Base):
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    prenom = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    mot_de_passe = Column(String, nullable=False)
    telephone = Column(String, nullable=True)
    adresse = Column(String, nullable=True)
    date_naissance = Column(Date, nullable=True)
    genre = Column(String, nullable=True)
    avatar = Column(String, nullable=True)
    statut = Column(String, default="actif", nullable=False)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())

    interactions = relationship("InteractionPublique", back_populates="participant")
    reservations = relationship("Reservation", back_populates="participant")