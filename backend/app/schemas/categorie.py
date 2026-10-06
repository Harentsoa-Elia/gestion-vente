from pydantic import BaseModel, Field
from typing import Optional


class CategorieBase(BaseModel):
    nom: str = Field(..., min_length=1, description="Nom de la categorie")
    description: Optional[str] = Field(None, description="Description de la categorie")


class CategorieCreate(CategorieBase):
    pass


class CategorieResponse(CategorieBase):
    id: int = Field(..., description="Unique ID de la categorie")
    fond_url: Optional[str] = Field(None, description="Fond d'image par défaut des billets de ce type d'événement")

    class Config:
        from_attributes = True