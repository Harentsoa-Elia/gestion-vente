from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class CodeScanne(BaseModel):
    code: str = Field(..., min_length=1, max_length=500, description="Contenu du QR code, ou numéro du billet saisi à la main (BLT-...)")


class BilletScanne(BaseModel):
    numero: str
    categorie: str
    participant: str
    date_scan: Optional[datetime] = None


class TarifEntrees(BaseModel):
    nom: str
    vendus: int
    entres: int


class EvenementControle(BaseModel):
    id: int
    titre: str
    date_debut: datetime
    lieu: Optional[str] = None
    billets_vendus: int
    entres: int


class EtatEntrees(EvenementControle):
    par_tarif: List[TarifEntrees]
    derniers: List[BilletScanne]


StatutScan = Literal["valide", "deja_utilise", "autre_evenement", "inconnu"]


class ResultatScan(BaseModel):
    statut: StatutScan
    message: str
    billet: Optional[BilletScanne] = None
    # événement du billet quand il n'est pas celui contrôlé
    evenement_billet: Optional[str] = None
    billets_vendus: int
    entres: int
