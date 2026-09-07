from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ReservationBase(BaseModel):
    evenement_id: int = Field(..., description="ID de l'evenement concerne")


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