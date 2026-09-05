from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime
from enum import Enum


class InteractionType(str, Enum):
    LIKE = "LIKE"
    COMMENTAIRE = "COMMENTAIRE"
    FAVORI = "FAVORI"


class InteractionPubliqueBase(BaseModel):
    type_interaction: InteractionType = Field(..., description="Type d'interaction")
    contenu: Optional[str] = Field(None, description="Contenu du commentaire, le cas echeant")
    proposition_id: int = Field(..., description="ID de la proposition concernee")

    @model_validator(mode="after")
    def verifier_contenu(self):
        if self.type_interaction == InteractionType.COMMENTAIRE and not self.contenu:
            raise ValueError("contenu requis pour un commentaire")
        if self.type_interaction != InteractionType.COMMENTAIRE and self.contenu:
            raise ValueError("contenu ne doit etre renseigne que pour un commentaire")
        return self


class InteractionPubliqueCreate(InteractionPubliqueBase):
    pass


class InteractionPubliqueResponse(InteractionPubliqueBase):
    id: int = Field(..., description="Unique ID de l'interaction")
    participant_id: int
    date_interaction: datetime

    class Config:
        from_attributes = True