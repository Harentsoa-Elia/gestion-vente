from pydantic import BaseModel, Field
from typing import Optional


class CategorieBase(BaseModel):
    nom: str = Field(..., min_length=1, description="Nom de la categorie")
    description: Optional[str] = Field(None, description="Description de la categorie")


class CategorieCreate(CategorieBase):
    pass


class CategorieResponse(CategorieBase):
    id: int = Field(..., description="Unique ID de la categorie")

    class Config:
        from_attributes = True