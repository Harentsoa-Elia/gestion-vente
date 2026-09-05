from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.evenement import EvenementCreate, EvenementResponse
from app.services.evenement_service import EvenementService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["evenements"])


def check_access(auth_data: dict, evenement_organisateur_id: int):
    user_concert_id = auth_data.get("concert_id")
    user_id = auth_data.get("user_id")
    if user_concert_id == 0:
        return True
    if user_id != evenement_organisateur_id:
        raise HTTPException(status_code=403, detail="Access denied for this evenement.")
    return True


@router.post(
    "/evenements",
    response_model=EvenementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new evenement",
)
async def create_evenement(
    evenement: EvenementCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = EvenementService(db)
    organisateur_id = auth_data.get("user_id")
    return await service.create_evenement(evenement, organisateur_id)


@router.get("/evenements", response_model=List[EvenementResponse], summary="Get all evenements")
async def get_all_evenements(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = EvenementService(db)
    return await service.get_all_evenements()


@router.get("/evenements/{evenement_id}", response_model=EvenementResponse, summary="Get a specific evenement")
async def get_evenement(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = EvenementService(db)
    evenement = await service.get_evenement(evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    return evenement


@router.put("/evenements/{evenement_id}", response_model=EvenementResponse, summary="Update an evenement")
async def update_evenement(
    evenement_id: int,
    evenement: EvenementCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = EvenementService(db)
    existing = await service.get_evenement(evenement_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    check_access(auth_data, existing.organisateur_id)

    updated_evenement = await service.update_evenement(evenement_id, evenement)
    return updated_evenement


@router.delete("/evenements/{evenement_id}", status_code=200, summary="Delete an evenement")
async def delete_evenement(
    evenement_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = EvenementService(db)
    evenement = await service.get_evenement(evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    check_access(auth_data, evenement.organisateur_id)

    await service.delete_evenement(evenement_id)
    return {"message": "Evenement deleted successfully."}