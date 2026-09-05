from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.lieu import LieuCreate, LieuResponse
from app.services.lieu_service import LieuService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["lieux"])


@router.post(
    "/lieux",
    response_model=LieuResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new lieu",
)
async def create_lieu(
    lieu: LieuCreate,
    db: AsyncSession = Depends(get_db),
):
    service = LieuService(db)
    return await service.create_lieu(lieu)


@router.get("/lieux", response_model=List[LieuResponse], summary="Get all lieux")
async def get_all_lieux(
    db: AsyncSession = Depends(get_db),
):
    service = LieuService(db)
    return await service.get_all_lieux()


@router.get("/lieux/{lieu_id}", response_model=LieuResponse, summary="Get a specific lieu")
async def get_lieu(
    lieu_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = LieuService(db)
    lieu = await service.get_lieu(lieu_id)
    if not lieu:
        raise HTTPException(status_code=404, detail="Lieu not found.")
    return lieu


@router.put("/lieux/{lieu_id}", response_model=LieuResponse, summary="Update a lieu")
async def update_lieu(
    lieu_id: int,
    lieu: LieuCreate,
    db: AsyncSession = Depends(get_db),
):
    service = LieuService(db)
    updated_lieu = await service.update_lieu(lieu_id, lieu)
    if not updated_lieu:
        raise HTTPException(status_code=404, detail="Lieu not found.")
    return updated_lieu


@router.delete("/lieux/{lieu_id}", status_code=200, summary="Delete a lieu")
async def delete_lieu(
    lieu_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = LieuService(db)
    lieu = await service.get_lieu(lieu_id)
    if not lieu:
        raise HTTPException(status_code=404, detail="Lieu not found.")
    await service.delete_lieu(lieu_id)
    return {"message": "Lieu deleted successfully."}