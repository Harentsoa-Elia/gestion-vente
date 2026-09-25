from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
from sqlalchemy import select

from app.schemas.reservation import ReservationCreate, ReservationResponse, PaiementConfirmeResponse, ReservationDetailResponse, PaiementOrganisateurResponse
from app.schemas.billet import BilletResponse
from app.services.reservation_service import ReservationService
from app.auth.auth_bearer import ParticipantBearer, FlexibleBearer
from app.database import get_db
from app.auth.auth_bearer import JWTBearer
from app.models.evenement import Evenement
from app.models.participant import Participant
from app.schemas.reservation import ParticipantOrganisateurResponse

router = APIRouter(tags=["reservations"])


@router.post(
    "/reservations",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new reservation for an evenement",
)
async def create_reservation(
    reservation: ReservationCreate,
    auth_data: dict = Depends(ParticipantBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    participant_id = auth_data.get("participant_id")
    # les billets (QR code) sont envoyés par e-mail : l'adresse doit être confirmée
    participant = await db.get(Participant, participant_id)
    if participant is None or not participant.email_verifie:
        raise HTTPException(status_code=403, detail="EMAIL_NON_VERIFIE: Confirmez votre adresse e-mail avant de réserver.")
    try:
        return await service.create_reservation(reservation, participant_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get(
    "/reservations/moi",
    response_model=List[ReservationResponse],
    summary="Get all reservations for the current participant",
)
async def get_mes_reservations(
    auth_data: dict = Depends(ParticipantBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    participant_id = auth_data.get("participant_id")
    return await service.get_reservations_by_participant(participant_id)


@router.get("/reservations/{reservation_id}", response_model=ReservationResponse, summary="Get a specific reservation")
async def get_reservation(
    reservation_id: int,
    auth_data: dict = Depends(FlexibleBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    reservation = await service.get_reservation(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found.")

    is_owner = auth_data.get("account_type") == "participant" and reservation.participant_id == auth_data.get("participant_id")
    is_staff_admin = auth_data.get("account_type") == "staff" and auth_data.get("concert_id") == 0
    if not is_owner and not is_staff_admin:
        raise HTTPException(status_code=403, detail="Access denied for this reservation.")
    return reservation


@router.post(
    "/reservations/{reservation_id}/payer",
    response_model=PaiementConfirmeResponse,
    summary="Simulate payment for a reservation and generate the billet",
)
async def payer_reservation(
    reservation_id: int,
    auth_data: dict = Depends(ParticipantBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    reservation = await service.get_reservation(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    if reservation.participant_id != auth_data.get("participant_id"):
        raise HTTPException(status_code=403, detail="Access denied for this reservation.")

    try:
        paiement = await service.payer_reservation(reservation_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    billet = await service.get_billet_by_reservation(reservation_id)

    return PaiementConfirmeResponse(
        reservation_id=reservation_id,
        statut_reservation="confirmee",
        montant_paye=paiement.montant,
        numero_billet=billet.numero_billet,
        qr_code=billet.qr_code,
    )

@router.get("/reservations/{reservation_id}/billet", response_model=BilletResponse, summary="Get the billet for a reservation")
async def get_billet(
    reservation_id: int,
    auth_data: dict = Depends(FlexibleBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    reservation = await service.get_reservation(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found.")

    is_owner = auth_data.get("account_type") == "participant" and reservation.participant_id == auth_data.get("participant_id")
    is_staff_admin = auth_data.get("account_type") == "staff" and auth_data.get("concert_id") == 0
    if not is_owner and not is_staff_admin:
        raise HTTPException(status_code=403, detail="Access denied for this reservation.")

    billet = await service.get_billet_by_reservation(reservation_id)
    if not billet:
        raise HTTPException(status_code=404, detail="Billet not found. Payment may not be completed.")
    return billet

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
    is_admin = auth_data.get("concert_id") == 0
    if not is_owner and not is_admin:
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