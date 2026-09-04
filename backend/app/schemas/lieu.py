from pydantic import BaseModel, Field
from typing import Optional


class LieuBase(BaseModel):
    nom: str = Field(..., min_length=1, description="Nom du lieu")
    adresse: Optional[str] = Field(None, description="Adresse du lieu")
    ville: Optional[str] = Field(None, description="Ville du lieu")
    capacite: Optional[int] = Field(None, gt=0, description="Capacite du lieu")


class LieuCreate(LieuBase):
    pass


class LieuResponse(LieuBase):
    id: int = Field(..., description="Unique ID du lieu")

    class Config:
        from_attributes = True
    