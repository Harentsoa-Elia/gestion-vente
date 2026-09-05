from pydantic import BaseModel
from typing import Optional, List


class DashboardEvenementResponse(BaseModel):
    evenement_id: int
    titre: str
    capacite: Optional[int]
    taux_remplissage: Optional[float]
    score_popularite: int
    niveau_interet_estime: Optional[float]
    participation_estimee: Optional[int]


class EvenementPopulaireResponse(BaseModel):
    id: int
    titre: str
    score_popularite: int