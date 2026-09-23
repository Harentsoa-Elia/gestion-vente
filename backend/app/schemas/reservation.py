from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReservationBase(BaseModel):
    evenement_id: int = Field(..., description="ID de l'evenement concerne")
    categorie_billet_id: int = Field(..., description="ID de la categorie de billet choisie (VIP, Simple, etc.)")


class ReservationCreate(ReservationBase):
    pass


class ReservationResponse(ReservationBase):
    id: int = Field(..., description="Unique ID de la reservation")
    statut: str
    participant_id: int
    date_reservation: datetime

    class Config:
        from_attributes = True


class PaiementConfirmeResponse(BaseModel):
    reservation_id: int
    statut_reservation: str
    montant_paye: float
    numero_billet: str
    qr_code: str

class ParticipantSummary(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str

    class Config:
        from_attributes = True


class CategorieBilletSummary(BaseModel):
    id: int
    nom: str
    prix: float

    class Config:
        from_attributes = True


class ReservationDetailResponse(BaseModel):
    id: int
    statut: str
    date_reservation: datetime
    evenement_id: int
    participant: ParticipantSummary
    categorie_billet: CategorieBilletSummary

    class Config:
        from_attributes = True  

class ParticipantOrganisateurResponse(BaseModel):
    id: int
    nom: str
    prenom: str
    email: str
    telephone: Optional[str] = None
    nb_reservations: int
    montant_total_depense: float
    derniere_reservation: datetime

    class Config:
        from_attributes = True

class PaiementOrganisateurResponse(BaseModel):
    id: int
    montant: float
    statut_paiement: str
    mode_paiement: str
    date_paiement: Optional[datetime] = None
    evenement_titre: str
    participant_nom: str
    participant_prenom: str

    class Config:
        from_attributes = True