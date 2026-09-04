from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Lieu(Base):
    __tablename__ = "lieux"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    adresse = Column(String, nullable=True)
    ville = Column(String, nullable=True)
    capacite = Column(Integer, nullable=True)

    evenements = relationship("Evenement", back_populates="lieu")
    propositions = relationship("Proposition", back_populates="lieu")
    recommandations = relationship("Recommandation", back_populates="lieu")