from datetime import date, datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class Activite(BaseModel):
    type: Literal["vente", "inscription", "evenement", "entree"]
    date: datetime
    texte: str
    lien: Optional[str] = None


class VueEnsemble(BaseModel):
    organisateurs: int
    organisateurs_suspendus: int
    participants: int
    participants_verifies: int
    evenements: dict  # statut -> nombre
    billets_vendus: int
    total_ventes: float
    entrees: int
    ventes_30_jours: List[dict]  # {date, billets, montant}
    top_evenements: List[dict]  # {id, titre, vendus, recettes}
    activite: List[Activite]


class Organisateur(BaseModel):
    id: int
    fullname: str
    email: str
    role: str
    actif: bool
    evenements: int
    evenements_valides: int
    evenements_en_attente: int
    billets_vendus: int
    total_ventes: float


class OrganisateurCreation(BaseModel):
    fullname: str = Field(..., min_length=2)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: Literal["admin", "organisateur"] = "organisateur"


class OrganisateurModification(BaseModel):
    role: Optional[Literal["admin", "organisateur"]] = None
    actif: Optional[bool] = None


class ParticipantAdmin(BaseModel):
    id: int
    prenom: str
    nom: str
    email: str
    telephone: Optional[str] = None
    genre: Optional[str] = None
    date_naissance: Optional[date] = None
    avatar: Optional[str] = None  # photo de profil
    email_verifie: bool
    statut: str
    date_creation: Optional[datetime] = None
    billets: int
    total_depense: float


class ParticipantModification(BaseModel):
    statut: Literal["actif", "suspendu"]


class ElementReferentiel(BaseModel):
    id: int
    nom: str
    detail: Optional[str] = None
    utilisations: int  # événements + propositions qui l'utilisent
    fond_url: Optional[str] = None  # types d'événement : fond des billets


class Referentiel(BaseModel):
    categories: List[ElementReferentiel]
    lieux: List[ElementReferentiel]
    artistes: List[ElementReferentiel]
