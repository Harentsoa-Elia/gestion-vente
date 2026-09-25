from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class StatutValidation(str, Enum):
    BROUILLON = "brouillon"
    EN_ATTENTE_VALIDATION = "en_attente_validation"
    VALIDE = "valide"
    REJETE = "rejete"


class EvenementBase(BaseModel):
    titre: str = Field(..., min_length=1, description="Titre de l'evenement")
    description: str = Field(..., min_length=1, description="Description de l'evenement")
    date_debut: datetime = Field(..., description="Date et heure de debut")
    date_fin: Optional[datetime] = Field(None, description="Date et heure de fin")
    capacite: Optional[int] = Field(None, gt=0, description="Capacite maximale")
    lieu_id: Optional[int] = Field(None, description="ID du lieu associe")
    categorie_id: Optional[int] = Field(None, description="ID de la categorie associee")


class EvenementCreate(EvenementBase):
    pass


class EvenementUpdate(EvenementBase):
    titre: Optional[str] = Field(None, min_length=1)
    description: Optional[str] = Field(None, min_length=1)
    date_debut: Optional[datetime] = None


class EvenementResponse(EvenementBase):
    id: int = Field(..., description="Unique ID de l'evenement")
    organisateur_id: int
    statut_validation: StatutValidation
    date_creation: datetime
    prix_a_partir_de: Optional[float] = Field(None, description="Prix minimum parmi les categories de billet disponibles")
    nombre_vues: int = Field(0, description="Nombre de fois ou la page detail a ete consultee")
    image_url: Optional[str] = Field(None, description="Affiche de l'evenement (/media/...), modifiee via PUT /evenements/{id}/image")

    class Config:
        from_attributes = True