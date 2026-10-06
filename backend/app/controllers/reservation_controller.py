from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from sqlalchemy import select

from app.schemas.reservation import ReservationDetailResponse, PaiementOrganisateurResponse, ParticipantOrganisateurResponse
from app.services.reservation_service import ReservationService
from app.auth.auth_bearer import JWTBearer
from app.auth.roles import est_admin
from app.database import get_db
from app.models.evenement import Evenement

router = APIRouter(tags=["reservations"])


@router.get(
    "/evenements/{evenement_id}/reservations",
    response_model=List[ReservationDetailResponse],
    summary="Get all reservations for a specific evenement (staff only)",
)
async def get_reservations_evenement(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Evenement).where(Evenement.id == evenement_id))
    evenement = result.scalar_one_or_none()
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")

    is_owner = evenement.organisateur_id == auth_data.get("user_id")
    if not is_owner and not est_admin(auth_data):
        raise HTTPException(status_code=403, detail="Access denied for this evenement.")

    service = ReservationService(db)
    return await service.get_reservations_by_evenement(evenement_id)

@router.get(
    "/organisateur/participants",
    response_model=List[ParticipantOrganisateurResponse],
    summary="Get participants who reserved for the current organisateur's evenements",
)
async def get_mes_participants(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    rows = await service.get_participants_by_organisateur(auth_data.get("user_id"))
    return [
        ParticipantOrganisateurResponse(
            id=row.id,
            nom=row.nom,
            prenom=row.prenom,
            email=row.email,
            telephone=row.telephone,
            avatar=row.avatar,
            nb_reservations=row.nb_reservations,
            montant_total_depense=row.montant_total_depense,
            derniere_reservation=row.derniere_reservation,
        )
        for row in rows
    ]

@router.get(
    "/organisateur/paiements",
    response_model=List[PaiementOrganisateurResponse],
    summary="Get payments for the current organisateur's evenements",
)
async def get_mes_paiements(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    rows = await service.get_paiements_by_organisateur(auth_data.get("user_id"))
    return [
        PaiementOrganisateurResponse(
            id=row.id,
            montant=row.montant,
            statut_paiement=row.statut_paiement,
            mode_paiement=row.mode_paiement,
            date_paiement=row.date_paiement,
            evenement_titre=row.evenement_titre,
            participant_nom=row.participant_nom,
            participant_prenom=row.participant_prenom,
        )
        for row in rows
    ]