from sqlalchemy import Column, Integer, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Recommandation(Base):
    __tablename__ = "recommandations"

    id = Column(Integer, primary_key=True, index=True)
    niveau_interet_estime = Column(Float, nullable=True)
    participation_estimee = Column(Integer, nullable=True)
    date_calcul = Column(DateTime(timezone=True), server_default=func.now())

    evenement_id = Column(Integer, ForeignKey("evenements.id"), unique=True, nullable=False)
    artiste_id = Column(Integer, ForeignKey("artistes.id"), nullable=True)
    lieu_id = Column(Integer, ForeignKey("lieux.id"), nullable=True)
    categorie_id = Column(Integer, ForeignKey("categories.id"), nullable=True)

    evenement = relationship("Evenement", back_populates="recommandation")
    artiste = relationship("Artiste", back_populates="recommandations")
    lieu = relationship("Lieu", back_populates="recommandations")
    categorie = relationship("Categorie", back_populates="recommandations")