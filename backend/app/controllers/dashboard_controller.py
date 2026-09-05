from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.dashboard import DashboardEvenementResponse, EvenementPopulaireResponse
from app.services.dashboard_service import DashboardService
from app.services.evenement_service import EvenementService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["dashboard"])


@router.get(
    "/evenements/{evenement_id}/dashboard",
    response_model=DashboardEvenementResponse,
    summary="Get dashboard data for a specific evenement",
)
async def get_dashboard_evenement(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    evenement_service = EvenementService(db)
    evenement = await evenement_service.get_evenement(evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")

    user_concert_id = auth_data.get("concert_id")
    if user_concert_id != 0 and auth_data.get("user_id") != evenement.organisateur_id:
        raise HTTPException(status_code=403, detail="Access denied for this evenement.")

    service = DashboardService(db)
    data = await service.get_dashboard_evenement(evenement_id)
    if not data:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    return data


@router.get(
    "/organisateurs/moi/evenements-populaires",
    response_model=List[EvenementPopulaireResponse],
    summary="Get most popular evenements for the current organisateur",
)
async def get_evenements_populaires(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    organisateur_id = auth_data.get("user_id")
    service = DashboardService(db)
    return await service.get_evenements_populaires(organisateur_id)