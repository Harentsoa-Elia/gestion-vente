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
    # Facultatif à la création : s'il est absent, le service reprend le nom du lieu,
    # de l'artiste ou de la catégorie choisi, pour que le libellé affiché au public
    # corresponde toujours à l'élément réellement proposé.
    libelle: Optional[str] = Field(None, description="Libelle de la proposition (par defaut : nom de l'element propose)")
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
    libelle: str
    id: int = Field(..., description="Unique ID de la proposition")
    date_proposition: datetime

    class Config:
        from_attributes = True


class PropositionAvecScoreResponse(PropositionResponse):
    score: int = Field(..., description="Score actuel calcule a partir des interactions")    