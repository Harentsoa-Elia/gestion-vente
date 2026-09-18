from pydantic import BaseModel, Field
from typing import Optional


class CategorieBilletBase(BaseModel):
    nom: str = Field(..., min_length=1, description="Nom de la categorie (ex: VIP, Simple)")
    prix: float = Field(..., gt=0, description="Prix du billet pour cette categorie")
    quantite_disponible: Optional[int] = Field(None, ge=0, description="Stock disponible, illimite si non renseigne")


class CategorieBilletCreate(CategorieBilletBase):
    evenement_id: int = Field(..., description="ID de l'evenement concerne")


class CategorieBilletUpdate(BaseModel):
    nom: Optional[str] = Field(None, min_length=1)
    prix: Optional[float] = Field(None, gt=0)
    quantite_disponible: Optional[int] = Field(None, ge=0)


class CategorieBilletResponse(CategorieBilletBase):
    id: int
    evenement_id: int

    class Config:
        from_attributes = True