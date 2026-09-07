from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.reservation import ReservationCreate, ReservationResponse, PaiementConfirmeResponse
from app.schemas.billet import BilletResponse
from app.services.reservation_service import ReservationService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["reservations"])


@router.post(
    "/reservations",
    response_model=ReservationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new reservation for an evenement",
)
async def create_reservation(
    reservation: ReservationCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    participant_id = auth_data.get("user_id")
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
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    participant_id = auth_data.get("user_id")
    return await service.get_reservations_by_participant(participant_id)


@router.get("/reservations/{reservation_id}", response_model=ReservationResponse, summary="Get a specific reservation")
async def get_reservation(
    reservation_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    reservation = await service.get_reservation(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    if reservation.participant_id != auth_data.get("user_id") and auth_data.get("concert_id") != 0:
        raise HTTPException(status_code=403, detail="Access denied for this reservation.")
    return reservation


@router.post(
    "/reservations/{reservation_id}/payer",
    response_model=PaiementConfirmeResponse,
    summary="Simulate payment for a reservation and generate the billet",
)
async def payer_reservation(
    reservation_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    reservation = await service.get_reservation(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    if reservation.participant_id != auth_data.get("user_id"):
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
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ReservationService(db)
    reservation = await service.get_reservation(reservation_id)
    if not reservation:
        raise HTTPException(status_code=404, detail="Reservation not found.")
    if reservation.participant_id != auth_data.get("user_id") and auth_data.get("concert_id") != 0:
        raise HTTPException(status_code=403, detail="Access denied for this reservation.")

    billet = await service.get_billet_by_reservation(reservation_id)
    if not billet:
        raise HTTPException(status_code=404, detail="Billet not found. Payment may not be completed.")
    return billet