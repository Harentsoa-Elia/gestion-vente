from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from enum import Enum as PyEnum

class InteractionType(str, PyEnum):
    LIKE = "LIKE"
    COMMENTAIRE = "COMMENTAIRE"
    FAVORI = "FAVORI"

class InteractionPublique(Base):
    __tablename__ = "interactions_publiques"

    id = Column(Integer, primary_key=True, index=True)
    type_interaction = Column(Enum(InteractionType, name="interactiontype"), nullable=False)
    contenu = Column(String, nullable=True)
    date_interaction = Column(DateTime(timezone=True), server_default=func.now())

    proposition_id = Column(Integer, ForeignKey("propositions.id"), nullable=False)
    participant_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    proposition = relationship("Proposition", back_populates="interactions")