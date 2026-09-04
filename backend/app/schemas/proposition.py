from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class PropositionType(str, Enum):
    ARTISTE = "ARTISTE"
    LIEU = "LIEU"
    CATEGORIE = "CATEGORIE"


class PropositionBase(BaseModel):
    type: PropositionType = Field(..., description="Type de proposition")
    libelle: str = Field(..., min_length=1, description="Libelle de la proposition")
    evenement_id: int = Field(..., description="ID de l'evenement concerne")
    artiste_id: Optional[int] = Field(None, description="ID de l'artiste propose")
    lieu_id: Optional[int] = Field(None, description="ID du lieu propose")
    categorie_id: Optional[int] = Field(None, description="ID de la categorie proposee")


class PropositionCreate(PropositionBase):
    pass


class PropositionResponse(PropositionBase):
    id: int = Field(..., description="Unique ID de la proposition")
    date_proposition: datetime

    class Config:
        from_attributes = True