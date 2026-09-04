from pydantic import BaseModel, Field
from typing import Optional


class ArtisteBase(BaseModel):
    nom: str = Field(..., min_length=1, description="Nom de l'artiste")
    description: Optional[str] = Field(None, description="Description de l'artiste")
    image_url: Optional[str] = Field(None, description="URL de l'image de l'artiste")
    genre_artistique: Optional[str] = Field(None, description="Genre artistique")


class ArtisteCreate(ArtisteBase):
    pass


class ArtisteResponse(ArtisteBase):
    id: int = Field(..., description="Unique ID de l'artiste")

    class Config:
        from_attributes = True