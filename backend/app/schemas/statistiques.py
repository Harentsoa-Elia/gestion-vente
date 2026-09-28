from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class StatEvenement(BaseModel):
    id: int
    titre: str
    date_debut: datetime
    capacite: Optional[int] = None  # capacité de l'événement, sinon somme des quotas des tarifs
    vendus: int
    entres: int
    recettes: float
    taux_remplissage: Optional[float] = None  # % ; None si la capacité est inconnue
    score_popularite: int


class Indicateurs(BaseModel):
    billets_vendus: int
    recettes: float
    entres: int
    non_scannes: int
    capacite: Optional[int] = None
    places_restantes: Optional[int] = None
    taux_remplissage: Optional[float] = None
    en_attente: int  # réservations non payées encore gardées (15 min)
    participants: int  # acheteurs distincts


class VenteJour(BaseModel):
    date: date
    billets: int
    montant: float


class VenteTarif(BaseModel):
    nom: str
    vendus: int
    montant: float


class Repartition(BaseModel):
    libelle: str
    nombre: int


class Statistiques(BaseModel):
    evenement_id: Optional[int] = None
    indicateurs: Indicateurs
    ventes_par_jour: List[VenteJour]
    par_tarif: List[VenteTarif]
    genres: List[Repartition]
    tranches_age: List[Repartition]
    evenements: List[StatEvenement]
