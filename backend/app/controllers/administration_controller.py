"""Espace administrateur : vue d'ensemble, comptes (organisateurs, participants), référentiel."""
from typing import List

from fastapi import APIRouter, Body, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_bearer import JWTBearer
from app.auth.roles import exiger_admin
from app.controllers.user_controller import hash_password
from app.database import get_db
from app.schemas.administration import (
    Organisateur,
    OrganisateurCreation,
    OrganisateurModification,
    ParticipantAdmin,
    ParticipantModification,
    Referentiel,
    VueEnsemble,
)
from app.services.administration_service import AdministrationService, ErreurAdministration

router = APIRouter(prefix="/admin", tags=["administration"])


def admin(auth_data: dict = Depends(JWTBearer())) -> dict:
    exiger_admin(auth_data)
    return auth_data


def erreur(e: ErreurAdministration) -> HTTPException:
    return HTTPException(status_code=409, detail=str(e))


@router.get("/vue-ensemble", response_model=VueEnsemble, summary="Supervision : chiffres de la plateforme et activité récente")
async def vue_ensemble(auth_data: dict = Depends(admin), db: AsyncSession = Depends(get_db)):
    return await AdministrationService(db).vue_ensemble()


@router.get("/organisateurs", response_model=List[Organisateur], summary="Comptes de l'équipe (organisateurs et administrateurs)")
async def organisateurs(auth_data: dict = Depends(admin), db: AsyncSession = Depends(get_db)):
    return await AdministrationService(db).organisateurs()


@router.post("/organisateurs", status_code=201, summary="Créer un compte organisateur ou administrateur")
async def creer_organisateur(saisie: OrganisateurCreation = Body(...), auth_data: dict = Depends(admin), db: AsyncSession = Depends(get_db)):
    try:
        u = await AdministrationService(db).creer_organisateur(saisie.fullname, saisie.email, hash_password(saisie.password), saisie.role)
    except ErreurAdministration as e:
        raise erreur(e)
    return {"id": u.id, "message": f"Compte de {u.fullname} créé."}


@router.patch("/organisateurs/{user_id}", summary="Changer le rôle ou suspendre / réactiver un compte")
async def modifier_organisateur(
    user_id: int, saisie: OrganisateurModification = Body(...), auth_data: dict = Depends(admin), db: AsyncSession = Depends(get_db)
):
    try:
        await AdministrationService(db).modifier_organisateur(auth_data["user_id"], user_id, saisie.role, saisie.actif)
    except ErreurAdministration as e:
        raise erreur(e)
    return {"message": "Compte mis à jour."}


@router.delete("/organisateurs/{user_id}", summary="Supprimer un compte sans événement")
async def supprimer_organisateur(user_id: int, auth_data: dict = Depends(admin), db: AsyncSession = Depends(get_db)):
    try:
        await AdministrationService(db).supprimer_organisateur(auth_data["user_id"], user_id)
    except ErreurAdministration as e:
        raise erreur(e)
    return {"message": "Compte supprimé."}


@router.get("/participants", response_model=List[ParticipantAdmin], summary="Participants inscrits")
async def participants(auth_data: dict = Depends(admin), db: AsyncSession = Depends(get_db)):
    return await AdministrationService(db).participants()


@router.patch("/participants/{participant_id}", summary="Suspendre ou réactiver un participant")
async def modifier_participant(
    participant_id: int, saisie: ParticipantModification = Body(...), auth_data: dict = Depends(admin), db: AsyncSession = Depends(get_db)
):
    try:
        await AdministrationService(db).modifier_participant(participant_id, saisie.statut)
    except ErreurAdministration as e:
        raise erreur(e)
    return {"message": "Participant mis à jour."}


@router.get("/referentiel", response_model=Referentiel, summary="Types d'événement, lieux et artistes, avec leur utilisation")
async def referentiel(auth_data: dict = Depends(admin), db: AsyncSession = Depends(get_db)):
    return await AdministrationService(db).referentiel()


@router.delete("/referentiel/{table}/{element_id}", summary="Supprimer un élément non utilisé du référentiel")
async def supprimer_element(table: str, element_id: int, auth_data: dict = Depends(admin), db: AsyncSession = Depends(get_db)):
    try:
        nom = await AdministrationService(db).supprimer_element(table, element_id)
    except ErreurAdministration as e:
        raise erreur(e)
    return {"message": f"« {nom} » supprimé."}
