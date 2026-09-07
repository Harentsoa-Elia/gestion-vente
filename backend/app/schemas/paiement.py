from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class PaiementResponse(BaseModel):
    id: int = Field(..., description="Unique ID du paiement")
    montant: float
    statut_paiement: str
    mode_paiement: str
    date_paiement: Optional[datetime]
    reservation_id: int

    class Config:
        from_attributes = True