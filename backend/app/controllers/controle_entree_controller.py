"""Contrôle des billets à l'entrée (espace organisateur)."""
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_bearer import JWTBearer
from app.database import get_db
from app.models.evenement import Evenement
from app.schemas.controle_entree import CodeScanne, EtatEntrees, EvenementControle, ResultatScan
from app.services.controle_entree_service import ControleEntreeService, peut_controler

router = APIRouter(tags=["contrôle des entrées"])


async def evenement_controlable(evenement_id: int, auth_data: dict, db: AsyncSession) -> Evenement:
    evenement = await db.get(Evenement, evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Événement introuvable.")
    if not peut_controler(auth_data, evenement):
        raise HTTPException(status_code=403, detail="Vous ne pouvez contrôler que les billets de vos événements.")
    return evenement


@router.get("/organisateur/controle/evenements", response_model=List[EvenementControle], summary="Événements dont on peut contrôler les billets")
async def evenements_controle(auth_data: dict = Depends(JWTBearer()), db: AsyncSession = Depends(get_db)):
    return await ControleEntreeService(db).evenements(auth_data)


@router.get("/organisateur/evenements/{evenement_id}/entrees", response_model=EtatEntrees, summary="Entrées : billets vendus, scannés, derniers passages")
async def etat_entrees(evenement_id: int, auth_data: dict = Depends(JWTBearer()), db: AsyncSession = Depends(get_db)):
    evenement = await evenement_controlable(evenement_id, auth_data, db)
    return await ControleEntreeService(db).etat(evenement)


@router.post("/organisateur/evenements/{evenement_id}/scanner", response_model=ResultatScan, summary="Scanner un billet à l'entrée")
async def scanner(
    evenement_id: int,
    saisie: CodeScanne = Body(...),
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    evenement = await evenement_controlable(evenement_id, auth_data, db)
    return await ControleEntreeService(db).scanner(evenement, saisie.code)
