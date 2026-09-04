from pydantic import BaseModel, Field
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
    participant_id: int = Field(..., description="ID du participant")


class InteractionPubliqueCreate(InteractionPubliqueBase):
    pass


class InteractionPubliqueResponse(InteractionPubliqueBase):
    id: int = Field(..., description="Unique ID de l'interaction")
    date_interaction: datetime

    class Config:
        from_attributes = True