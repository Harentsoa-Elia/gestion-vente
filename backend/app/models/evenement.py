from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Evenement(Base):
    __tablename__ = "evenements"

    id = Column(Integer, primary_key=True, index=True)
    titre = Column(String, index=True, nullable=False)
    description = Column(String, nullable=False)
    date_debut = Column(DateTime(timezone=True), nullable=False)
    date_fin = Column(DateTime(timezone=True), nullable=True)
    capacite = Column(Integer, nullable=True)
    prix_billet = Column(Float, nullable=True)
    statut_validation = Column(String, default="brouillon", nullable=False)
    date_creation = Column(DateTime(timezone=True), server_default=func.now())

    lieu_id = Column(Integer, ForeignKey("lieux.id"), nullable=True)
    categorie_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    organisateur_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    lieu = relationship("Lieu", back_populates="evenements")
    categorie = relationship("Categorie", back_populates="evenements")
    propositions = relationship("Proposition", back_populates="evenement")
    recommandation = relationship("Recommandation", back_populates="evenement", uselist=False)