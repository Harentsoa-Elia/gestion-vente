from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class RecommandationBase(BaseModel):
    niveau_interet_estime: Optional[float] = Field(None, ge=0, le=100, description="Niveau d'interet estime en pourcentage")
    participation_estimee: Optional[int] = Field(None, ge=0, description="Nombre de participants estime")
    evenement_id: int = Field(..., description="ID de l'evenement concerne")
    artiste_id: Optional[int] = Field(None, description="ID de l'artiste recommande")
    lieu_id: Optional[int] = Field(None, description="ID du lieu recommande")
    categorie_id: Optional[int] = Field(None, description="ID de la categorie recommandee")


class RecommandationResponse(RecommandationBase):
    id: int = Field(..., description="Unique ID de la recommandation")
    date_calcul: datetime

    class Config:
        from_attributes = True