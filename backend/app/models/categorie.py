from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Categorie(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    description = Column(String, nullable=True)

    evenements = relationship("Evenement", back_populates="categorie")
    propositions = relationship("Proposition", back_populates="categorie")
    recommandations = relationship("Recommandation", back_populates="categorie")