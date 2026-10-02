from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field

ModePaiement = Literal["mvola", "orange_money", "airtel_money"]


class ReservationLot(BaseModel):
    evenement_id: int
    categorie_billet_id: int
    quantite: int = Field(1, ge=1, le=10, description="Nombre de billets (1 à 10)")


class PaiementLot(BaseModel):
    reservation_ids: List[int] = Field(..., min_length=1, max_length=10)
    mode_paiement: ModePaiement
    telephone: str = Field(..., min_length=9, max_length=20, description="Numéro Mobile Money (paiement simulé)")


class TarifDisponible(BaseModel):
    id: int
    nom: str
    prix: float
    quantite_disponible: Optional[int] = None
    restantes: Optional[int] = None  # None : pas de limite


class ReservationEnAttente(BaseModel):
    id: int
    montant: float
    expire_le: datetime


class LotReserve(BaseModel):
    reservations: List[ReservationEnAttente]
    montant_total: float
    evenement_titre: str
    categorie_nom: str


class BilletParticipant(BaseModel):
    """Une réservation du participant, avec son billet s'il est payé (page 'Mes billets')."""
    reservation_id: int
    statut: str  # en_attente | confirmee
    date_reservation: datetime
    expire_le: Optional[datetime] = None
    evenement_id: int
    evenement_titre: str
    evenement_date: datetime
    evenement_image: Optional[str] = None
    lieu: Optional[str] = None
    categorie_nom: str
    prix: float
    mode_paiement: Optional[str] = None
    date_paiement: Optional[datetime] = None
    numero_billet: Optional[str] = None
    qr_code: Optional[str] = None
    utilise: bool = False
    date_scan: Optional[datetime] = None  # heure du passage à l'entrée


class PaiementConfirme(BaseModel):
    montant_total: float
    mode_paiement: ModePaiement
    reference: str
    email: str
    billets: List[BilletParticipant]
