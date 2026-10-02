from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.recommandation import RecommandationResponse
from app.services.recommandation_service import RecommandationService
from app.services.evenement_service import EvenementService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db
from app.auth.roles import est_admin

router = APIRouter(tags=["recommandations"])


async def check_access(auth_data: dict, evenement_service: EvenementService, evenement_id: int):
    if est_admin(auth_data):
        return True
    evenement = await evenement_service.get_evenement(evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    if auth_data.get("user_id") != evenement.organisateur_id:
        raise HTTPException(status_code=403, detail="Access denied for this evenement.")
    return True


@router.post(
    "/evenements/{evenement_id}/recommandation/calculer",
    response_model=RecommandationResponse,
    status_code=status.HTTP_200_OK,
    summary="Calculer ou recalculer la recommandation pour un evenement",
)
async def calculer_recommandation(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    evenement_service = EvenementService(db)
    await check_access(auth_data, evenement_service, evenement_id)

    service = RecommandationService(db)
    try:
        return await service.calculer_recommandation(evenement_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get(
    "/evenements/{evenement_id}/recommandation",
    response_model=RecommandationResponse,
    summary="Consulter la recommandation existante pour un evenement",
)
async def get_recommandation(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    evenement_service = EvenementService(db)
    await check_access(auth_data, evenement_service, evenement_id)

    service = RecommandationService(db)
    recommandation = await service.get_recommandation(evenement_id)
    if not recommandation:
        raise HTTPException(status_code=404, detail="Aucune recommandation calculee pour cet evenement.")
    return recommandation