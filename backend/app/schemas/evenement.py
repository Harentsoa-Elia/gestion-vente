from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class EvenementBase(BaseModel):
    titre: str = Field(..., min_length=1, description="Titre de l'evenement")
    description: str = Field(..., min_length=1, description="Description de l'evenement")
    date_debut: datetime = Field(..., description="Date et heure de debut")
    date_fin: Optional[datetime] = Field(None, description="Date et heure de fin")
    capacite: Optional[int] = Field(None, gt=0, description="Capacite maximale")
    prix_billet: Optional[float] = Field(None, gt=0, description="Prix du billet")
    statut_validation: str = Field("brouillon", description="Statut de l'evenement")
    lieu_id: Optional[int] = Field(None, description="ID du lieu associe")
    categorie_id: Optional[int] = Field(None, description="ID de la categorie associee")


class EvenementCreate(EvenementBase):
    pass


class EvenementResponse(EvenementBase):
    id: int = Field(..., description="Unique ID de l'evenement")
    organisateur_id: int
    date_creation: datetime

    class Config:
        from_attributes = True