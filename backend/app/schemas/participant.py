from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import date, datetime


class ParticipantBase(BaseModel):
    nom: str = Field(..., min_length=1)
    prenom: str = Field(..., min_length=1)
    email: EmailStr
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    date_naissance: Optional[date] = None
    genre: Optional[str] = None
    avatar: Optional[str] = None


class ParticipantSignup(ParticipantBase):
    mot_de_passe: str = Field(..., min_length=6)


class ParticipantLogin(BaseModel):
    email: EmailStr
    mot_de_passe: str


class ParticipantUpdate(BaseModel):
    nom: Optional[str] = None
    prenom: Optional[str] = None
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    date_naissance: Optional[date] = None
    genre: Optional[str] = None
    avatar: Optional[str] = None
    mot_de_passe: Optional[str] = Field(None, min_length=6)


class ParticipantResponse(ParticipantBase):
    id: int
    statut: str
    date_creation: datetime

    class Config:
        from_attributes = True