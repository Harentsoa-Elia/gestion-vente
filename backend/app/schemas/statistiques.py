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


class HorsLigneType(BaseModel):
    type: str
    libelle: str
    emis: int
    vendus: int
    entres: int


class StatHorsLigne(BaseModel):
    emis: int  # billets hors ligne valables (non annulés)
    vendus: int  # réglés, sinon déclarés par le revendeur (au moins les billets scannés)
    invitations: int
    en_depot: int  # pas encore vendus, chez le revendeur ou au guichet
    entres: int
    non_scannes: int
    recettes: float  # billets vendus x prix
    a_encaisser: float  # recettes des lots pas encore réglés
    frais_payes: float
    par_type: List[HorsLigneType]


class Statistiques(BaseModel):
    evenement_id: Optional[int] = None
    indicateurs: Indicateurs
    ventes_par_jour: List[VenteJour]
    par_tarif: List[VenteTarif]
    genres: List[Repartition]
    tranches_age: List[Repartition]
    evenements: List[StatEvenement]
    hors_ligne: StatHorsLigne


class PilotageTarif(BaseModel):
    id: int
    nom: str
    prix: float
    quota: Optional[int] = None  # vide : sans limite
    vendus: int  # en ligne + hors ligne
    recettes: float
    part: float  # % des recettes de l'événement


class PilotageAttente(BaseModel):
    participant: str  # prénom et initiale du nom
    tarif: str
    billets: int
    montant: float
    expire_le: datetime


class PilotageAcheteur(BaseModel):
    participant: str
    billets: int
    montant: float


class Pilotage(BaseModel):
    evenement_id: int
    tarifs: List[PilotageTarif]
    recette_potentielle: Optional[float] = None  # si tout est vendu (tous les tarifs ont un quota)
    en_attente: List[PilotageAttente]
    montant_en_attente: float
    meilleurs_acheteurs: List[PilotageAcheteur]
