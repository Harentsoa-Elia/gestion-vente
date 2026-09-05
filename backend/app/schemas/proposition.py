from pydantic import BaseModel, Field, model_validator
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

    @model_validator(mode="after")
    def verifier_coherence_type(self):
        if self.type == PropositionType.ARTISTE and self.artiste_id is None:
            raise ValueError("artiste_id requis quand type est ARTISTE")
        if self.type == PropositionType.LIEU and self.lieu_id is None:
            raise ValueError("lieu_id requis quand type est LIEU")
        if self.type == PropositionType.CATEGORIE and self.categorie_id is None:
            raise ValueError("categorie_id requis quand type est CATEGORIE")
        return self


class PropositionCreate(PropositionBase):
    pass


class PropositionResponse(PropositionBase):
    id: int = Field(..., description="Unique ID de la proposition")
    date_proposition: datetime

    class Config:
        from_attributes = True