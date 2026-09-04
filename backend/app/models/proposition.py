from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from enum import Enum as PyEnum

class PropositionType(str, PyEnum):
    ARTISTE = "ARTISTE"
    LIEU = "LIEU"
    CATEGORIE = "CATEGORIE"

class Proposition(Base):
    __tablename__ = "propositions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(Enum(PropositionType, name="propositiontype"), nullable=False)
    libelle = Column(String, nullable=False)
    date_proposition = Column(DateTime(timezone=True), server_default=func.now())

    evenement_id = Column(Integer, ForeignKey("evenements.id"), nullable=False)
    artiste_id = Column(Integer, ForeignKey("artistes.id"), nullable=True)
    lieu_id = Column(Integer, ForeignKey("lieux.id"), nullable=True)
    categorie_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    evenement = relationship("Evenement", back_populates="propositions")
    artiste = relationship("Artiste", back_populates="propositions")
    lieu = relationship("Lieu", back_populates="propositions")
    categorie = relationship("Categorie", back_populates="propositions")
    interactions = relationship("InteractionPublique", back_populates="proposition")