"""Billets hors ligne (espace organisateur) et facturation de la plateforme (administrateur)."""
from typing import Literal, Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_bearer import JWTBearer
from app.auth.roles import exiger_admin, role_du_compte
from app.database import get_db
from app.schemas.hors_ligne import RevendeurFiche, RevendeurModification, EvenementLot, Facturation, GenerationLot, LotDetail, LotsOrganisateur, Reglement, VendusDeclares
from app.services.hors_ligne_service import ErreurHorsLigne, HorsLigneService

router = APIRouter(tags=["billets hors ligne"])


def equipe(auth_data: dict = Depends(JWTBearer())) -> dict:
    if role_du_compte(auth_data) is None:
        raise HTTPException(status_code=403, detail="Réservé à l'équipe (organisateur ou administrateur).")
    return auth_data


def erreur(e: ErreurHorsLigne) -> HTTPException:
    message = str(e)
    if message.startswith("SEUIL_NON_ATTEINT"):
        return HTTPException(status_code=409, detail=message)
    if message in ("Lot introuvable.", "Événement introuvable.", "Revendeur introuvable."):
        return HTTPException(status_code=404, detail=message)
    if "ne vous appartient pas" in message or "que pour vos événements" in message:
        return HTTPException(status_code=403, detail=message)
    return HTTPException(status_code=400, detail=message)


@router.get("/organisateur/hors-ligne/evenements", response_model=list[EvenementLot], summary="Événements pour lesquels générer des billets")
async def evenements(auth_data: dict = Depends(equipe), db: AsyncSession = Depends(get_db)):
    return await HorsLigneService(db).evenements_disponibles(auth_data)


@router.get("/organisateur/hors-ligne/lots", response_model=LotsOrganisateur, summary="Lots de billets hors ligne et frais payés")
async def lots(auth_data: dict = Depends(equipe), db: AsyncSession = Depends(get_db)):
    return await HorsLigneService(db).lots(auth_data)


@router.post("/organisateur/hors-ligne/lots", response_model=LotDetail, status_code=201, summary="Payer les frais et générer un lot de billets")
async def generer(saisie: GenerationLot = Body(...), auth_data: dict = Depends(equipe), db: AsyncSession = Depends(get_db)):
    service = HorsLigneService(db)
    try:
        lot = await service.generer(auth_data, saisie)
        return await service.detail(auth_data, lot.id)
    except ErreurHorsLigne as e:
        raise erreur(e)


@router.get("/organisateur/hors-ligne/lots/{lot_id}", response_model=LotDetail, summary="Détail d'un lot et de ses billets")
async def detail(lot_id: int, auth_data: dict = Depends(equipe), db: AsyncSession = Depends(get_db)):
    try:
        return await HorsLigneService(db).detail(auth_data, lot_id)
    except ErreurHorsLigne as e:
        raise erreur(e)


@router.get("/organisateur/hors-ligne/lots/{lot_id}/billets.pdf", summary="Impression : billets du lot en PDF", response_class=Response)
async def pdf(
    lot_id: int,
    format: Literal["planche", "a5"] = Query("planche", description="planche : 18 billets par page A4 à découper ; a5 : un billet par page"),
    de: Optional[int] = Query(None, ge=1, description="Premier billet à imprimer (position dans le lot)"),
    a: Optional[int] = Query(None, ge=1, description="Dernier billet à imprimer"),
    auth_data: dict = Depends(equipe),
    db: AsyncSession = Depends(get_db),
):
    try:
        contenu, nom = await HorsLigneService(db).pdf(auth_data, lot_id, format, de, a)
    except ErreurHorsLigne as e:
        raise erreur(e)
    return Response(content=contenu, media_type="application/pdf", headers={"Content-Disposition": f'inline; filename="{nom}"'})


@router.patch("/organisateur/hors-ligne/lots/{lot_id}/vendus", response_model=LotDetail, summary="Déclarer les billets vendus par le revendeur")
async def vendus(lot_id: int, saisie: VendusDeclares = Body(...), auth_data: dict = Depends(equipe), db: AsyncSession = Depends(get_db)):
    try:
        return await HorsLigneService(db).declarer_vendus(auth_data, lot_id, saisie.vendus)
    except ErreurHorsLigne as e:
        raise erreur(e)


@router.post("/organisateur/hors-ligne/lots/{lot_id}/reglement", response_model=LotDetail, summary="Règlement : argent des vendus rendu, invendus annulés")
async def reglement(lot_id: int, saisie: Reglement = Body(...), auth_data: dict = Depends(equipe), db: AsyncSession = Depends(get_db)):
    try:
        return await HorsLigneService(db).regler(auth_data, lot_id, saisie.numeros_invendus, saisie.forcer)
    except ErreurHorsLigne as e:
        raise erreur(e)


@router.get("/admin/facturation", response_model=Facturation, summary="Facturation : billets hors ligne générés et frais payés par organisateur")
async def facturation(auth_data: dict = Depends(JWTBearer()), db: AsyncSession = Depends(get_db)):
    exiger_admin(auth_data)
    return await HorsLigneService(db).facturation()


@router.get("/organisateur/hors-ligne/revendeurs", response_model=list[RevendeurFiche], summary="Revendeurs du dépôt-vente et leur bilan")
async def revendeurs(auth_data: dict = Depends(equipe), db: AsyncSession = Depends(get_db)):
    return await HorsLigneService(db).revendeurs(auth_data)


@router.patch("/organisateur/hors-ligne/revendeurs/{revendeur_id}", response_model=RevendeurFiche, summary="Modifier le nom ou le contact d'un revendeur")
async def modifier_revendeur(
    revendeur_id: int, saisie: RevendeurModification = Body(...), auth_data: dict = Depends(equipe), db: AsyncSession = Depends(get_db)
):
    try:
        return await HorsLigneService(db).modifier_revendeur(auth_data, revendeur_id, saisie.nom, saisie.contact)
    except ErreurHorsLigne as e:
        raise erreur(e)
