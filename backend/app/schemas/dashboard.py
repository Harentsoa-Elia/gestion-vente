from app.schemas.statistiques import StatHorsLigne
from pydantic import BaseModel
from typing import List, Optional


class EvenementPopulaireResponse(BaseModel):
    id: int
    titre: str
    score_popularite: int


class VenteParJourItem(BaseModel):
    date: str
    nombre: int


class CategoriePopulaireItem(BaseModel):
    categorie: str
    evenement: str = ""
    nombre: int


class DashboardOrganisateurResponse(BaseModel):
    evenements_publies: int
    billets_vendus: int
    taux_remplissage_moyen: float
    recettes_totales: float
    ventes_par_jour: List[VenteParJourItem]
    categories_populaires: List[CategoriePopulaireItem]
    reservations_confirmees: int = 0
    # billets hors ligne (null s'il n'y en a pas)
    hors_ligne: Optional[StatHorsLigne] = None
