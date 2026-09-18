from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class CategorieBillet(Base):
    __tablename__ = "categories_billet"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    prix = Column(Float, nullable=False)
    quantite_disponible = Column(Integer, nullable=True)

    evenement_id = Column(Integer, ForeignKey("evenements.id"), nullable=False)

    evenement = relationship("Evenement", back_populates="categories_billet")
    reservations = relationship("Reservation", back_populates="categorie_billet")