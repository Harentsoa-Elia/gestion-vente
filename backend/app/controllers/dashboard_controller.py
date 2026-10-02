from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.dashboard import (
    EvenementPopulaireResponse,
    DashboardOrganisateurResponse,
)
from app.services.dashboard_service import DashboardService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["dashboard"])


@router.get(
    "/organisateurs/moi/dashboard",
    response_model=DashboardOrganisateurResponse,
    summary="Get global dashboard KPIs across all evenements of the current organisateur",
)
async def get_dashboard_organisateur(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    organisateur_id = auth_data.get("user_id")
    if not organisateur_id:
        raise HTTPException(status_code=403, detail="Utilisateur non identifie.")
    service = DashboardService(db)
    return await service.get_dashboard_organisateur(organisateur_id)


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