from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.proposition import PropositionCreate, PropositionResponse
from app.services.proposition_service import PropositionService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["propositions"])


async def check_evenement_access(auth_data: dict, service: PropositionService, evenement_id: int):
    user_concert_id = auth_data.get("concert_id")
    if user_concert_id == 0:
        return True
    organisateur_id = await service.get_evenement_organisateur(evenement_id)
    if organisateur_id is None:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    if auth_data.get("user_id") != organisateur_id:
        raise HTTPException(status_code=403, detail="Access denied for this evenement.")
    return True


@router.post(
    "/propositions",
    response_model=PropositionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new proposition for an evenement",
)
async def create_proposition(
    proposition: PropositionCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = PropositionService(db)
    await check_evenement_access(auth_data, service, proposition.evenement_id)
    return await service.create_proposition(proposition)


@router.get(
    "/evenements/{evenement_id}/propositions",
    response_model=List[PropositionResponse],
    summary="Get all propositions for an evenement",
)
async def get_propositions_by_evenement(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = PropositionService(db)
    return await service.get_propositions_by_evenement(evenement_id)


@router.get("/propositions/{proposition_id}", response_model=PropositionResponse, summary="Get a specific proposition")
async def get_proposition(
    proposition_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = PropositionService(db)
    proposition = await service.get_proposition(proposition_id)
    if not proposition:
        raise HTTPException(status_code=404, detail="Proposition not found.")
    return proposition


@router.delete("/propositions/{proposition_id}", status_code=200, summary="Delete a proposition")
async def delete_proposition(
    proposition_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = PropositionService(db)
    proposition = await service.get_proposition(proposition_id)
    if not proposition:
        raise HTTPException(status_code=404, detail="Proposition not found.")
    await check_evenement_access(auth_data, service, proposition.evenement_id)
    await service.delete_proposition(proposition_id)
    return {"message": "Proposition deleted successfully."}