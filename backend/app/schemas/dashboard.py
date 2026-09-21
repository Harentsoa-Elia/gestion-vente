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
    billets_total: int
    billets_scannes: int
    billets_non_scannes: int


class EvenementPopulaireResponse(BaseModel):
    id: int
    titre: str
    score_popularite: int


class VenteParJourItem(BaseModel):
    date: str
    nombre: int


class CategoriePopulaireItem(BaseModel):
    categorie: str
    nombre: int


class DashboardOrganisateurResponse(BaseModel):
    evenements_publies: int
    billets_vendus: int
    taux_remplissage_moyen: float
    recettes_totales: float
    ventes_par_jour: List[VenteParJourItem]
    categories_populaires: List[CategoriePopulaireItem]