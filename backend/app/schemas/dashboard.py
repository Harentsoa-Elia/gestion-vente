from pydantic import BaseModel
from typing import List


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