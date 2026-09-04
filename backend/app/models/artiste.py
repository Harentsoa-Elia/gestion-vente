from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.database import Base

class Artiste(Base):
    __tablename__ = "artistes"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String, nullable=False)
    description = Column(String, nullable=True)
    image_url = Column(String, nullable=True)
    genre_artistique = Column(String, nullable=True)

    propositions = relationship("Proposition", back_populates="artiste")
    recommandations = relationship("Recommandation", back_populates="artiste")