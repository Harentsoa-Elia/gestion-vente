from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field

TypeLot = Literal["depot", "guichet", "invitation"]
ModePaiement = Literal["mvola", "orange_money", "airtel_money"]


class GenerationLot(BaseModel):
    type: TypeLot
    evenement_id: int
    categorie_billet_id: int
    quantite: int = Field(..., ge=1, le=500)
    revendeur_id: Optional[int] = Field(None, description="Revendeur déjà enregistré (dépôt-vente)")
    revendeur_nom: Optional[str] = Field(None, max_length=120, description="Nouvelle entreprise partenaire (dépôt-vente)")
    revendeur_contact: Optional[str] = Field(None, max_length=120, description="Téléphone ou e-mail du revendeur")
    # paiement des frais de la plateforme (Mobile Money simulé)
    mode_paiement: ModePaiement
    telephone: str = Field(..., min_length=9, max_length=20)


class TarifLot(BaseModel):
    id: int
    nom: str
    prix: float
    quantite_disponible: Optional[int] = None
    restantes: Optional[int] = None
    fond_url: Optional[str] = None


class EvenementLot(BaseModel):
    id: int
    titre: str
    date_debut: datetime
    tarifs: List[TarifLot]
    fond_type: Optional[str] = None


class VendusDeclares(BaseModel):
    vendus: int = Field(..., ge=0)


class Reglement(BaseModel):
    numeros_invendus: List[str] = Field(default_factory=list, description="Billets rendus invendus : ils seront annulés")
    forcer: bool = Field(False, description="Régler un dépôt-vente avant d'atteindre 80 % de billets vendus")


class LotResume(BaseModel):
    id: int
    type: TypeLot
    type_libelle: str
    evenement_id: int
    evenement_titre: str
    evenement_date: datetime
    categorie_nom: str
    revendeur_id: Optional[int] = None
    revendeur_nom: Optional[str] = None
    revendeur_contact: Optional[str] = None
    quantite: int
    prix_unitaire: float
    frais_unitaire: float
    montant_frais: float
    mode_paiement_frais: str
    reference_paiement: str
    date_creation: datetime
    statut: Literal["en_cours", "regle"]
    vendus_declares: int
    vendus: int
    utilises: int
    annules: int
    seuil: int
    seuil_atteint: bool
    montant_attendu: float
    date_reglement: Optional[datetime] = None
    montant_regle: Optional[float] = None
    fond_url: Optional[str] = None
    fond_source: Optional[Literal["tarif", "type"]] = None


class BilletLot(BaseModel):
    numero: str
    utilise: bool
    date_scan: Optional[datetime] = None
    annule: bool


class LotDetail(LotResume):
    billets: List[BilletLot]


class LotsOrganisateur(BaseModel):
    frais_unitaire: float
    seuil_pourcentage: int
    billets_generes: int
    frais_payes: float
    lots: List[LotResume]


class FacturationOrganisateur(BaseModel):
    organisateur_id: int
    nom: str
    email: str
    lots: int
    billets_generes: int
    frais_payes: float
    dernier_lot: Optional[datetime] = None


class Facturation(BaseModel):
    frais_unitaire: float
    billets_generes: int
    frais_payes: float
    par_type: Dict[str, int]
    organisateurs: List[FacturationOrganisateur]
    lots_recents: List[LotResume]


class RevendeurFiche(BaseModel):
    id: int
    nom: str
    contact: Optional[str] = None
    date_creation: datetime
    lots: int
    lots_en_cours: int
    lots_a_regler: int  # lots en cours dont 80 % des billets sont vendus
    billets_confies: int
    vendus: int
    rendus: int  # invendus rendus et annulés
    en_depot: int  # pas encore vendus, chez le revendeur
    a_encaisser: float  # billets vendus des lots pas encore réglés
    deja_regle: float
    dernier_lot: Optional[datetime] = None


class RevendeurModification(BaseModel):
    nom: Optional[str] = Field(None, max_length=120)
    contact: Optional[str] = Field(None, max_length=120)
