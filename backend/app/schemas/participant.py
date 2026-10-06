import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import date, datetime
from enum import Enum


def telephone_malgache(valeur: Optional[str]) -> Optional[str]:
    """Numéro mobile malgache facultatif : « +261 34 12 345 67 » ou « 034 12 345 67 » -> « 0341234567 »."""
    if valeur is None or not str(valeur).strip():
        return None
    chiffres = re.sub(r"\D", "", str(valeur))
    if chiffres.startswith("261"):
        chiffres = "0" + chiffres[3:]
    if not re.fullmatch(r"03[2-8]\d{7}", chiffres):
        raise ValueError("Numéro invalide : saisissez un numéro mobile malgache à 10 chiffres, ex. 034 12 345 67.")
    return chiffres


class Genre(str, Enum):
    MASCULIN = "Masculin"
    FEMININ = "Feminin"
    AUTRE = "Autre"


class ParticipantBase(BaseModel):
    nom: str = Field(..., min_length=1)
    prenom: str = Field(..., min_length=1)
    email: EmailStr
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    date_naissance: Optional[date] = None
    genre: Optional[Genre] = None
    avatar: Optional[str] = None


class ParticipantSignup(ParticipantBase):
    mot_de_passe: str = Field(..., min_length=6)
    # Obligatoires uniquement a l'inscription (le reste du profil peut
    # rester incomplet pour un compte deja cree via ParticipantUpdate).
    date_naissance: date = Field(..., description="Date de naissance (obligatoire)")
    genre: Genre = Field(..., description="Genre (obligatoire)")

    @field_validator("telephone")
    @classmethod
    def telephone_valide(cls, value: Optional[str]) -> Optional[str]:
        return telephone_malgache(value)

    @field_validator("date_naissance")
    @classmethod
    def date_naissance_dans_le_passe(cls, value: date) -> date:
        if value >= date.today():
            raise ValueError("La date de naissance doit etre anterieure a aujourd'hui.")
        return value


class ParticipantLogin(BaseModel):
    email: EmailStr
    mot_de_passe: str


class ParticipantUpdate(BaseModel):
    """Profil modifiable par le participant (page « Mon profil »). L'e-mail ne change pas ici."""
    nom: Optional[str] = Field(None, min_length=1, max_length=100)
    prenom: Optional[str] = Field(None, min_length=1, max_length=100)
    telephone: Optional[str] = None
    adresse: Optional[str] = None
    date_naissance: Optional[date] = None
    genre: Optional[Genre] = None
    mot_de_passe: Optional[str] = Field(None, min_length=6)

    @field_validator("telephone")
    @classmethod
    def telephone_valide(cls, value: Optional[str]) -> Optional[str]:
        return telephone_malgache(value)

    @field_validator("date_naissance")
    @classmethod
    def naissance_passee(cls, value: Optional[date]) -> Optional[date]:
        if value is not None and value >= date.today():
            raise ValueError("La date de naissance doit être antérieure à aujourd'hui.")
        return value


class ParticipantResponse(ParticipantBase):
    id: int
    statut: str
    email_verifie: bool = False
    date_creation: datetime

    class Config:
        from_attributes = True


# ---------- codes reçus par e-mail ----------

class SaisieCode(BaseModel):
    code: str = Field(..., pattern=r"^\s*\d{6}\s*$", description="Code à 6 chiffres reçu par e-mail")


class DemandeReinitialisation(BaseModel):
    email: EmailStr


class Reinitialisation(BaseModel):
    email: EmailStr
    code: str = Field(..., pattern=r"^\s*\d{6}\s*$")
    nouveau_mot_de_passe: str = Field(..., min_length=6)
