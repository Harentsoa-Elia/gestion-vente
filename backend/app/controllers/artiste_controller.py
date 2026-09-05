from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.artiste import ArtisteCreate, ArtisteResponse
from app.services.artiste_service import ArtisteService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["artistes"])


@router.post(
    "/artistes",
    response_model=ArtisteResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new artiste",
)
async def create_artiste(
    artiste: ArtisteCreate,
    db: AsyncSession = Depends(get_db),
):
    service = ArtisteService(db)
    return await service.create_artiste(artiste)


@router.get("/artistes", response_model=List[ArtisteResponse], summary="Get all artistes")
async def get_all_artistes(
    db: AsyncSession = Depends(get_db),
):
    service = ArtisteService(db)
    return await service.get_all_artistes()


@router.get("/artistes/{artiste_id}", response_model=ArtisteResponse, summary="Get a specific artiste")
async def get_artiste(
    artiste_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = ArtisteService(db)
    artiste = await service.get_artiste(artiste_id)
    if not artiste:
        raise HTTPException(status_code=404, detail="Artiste not found.")
    return artiste


@router.put("/artistes/{artiste_id}", response_model=ArtisteResponse, summary="Update an artiste")
async def update_artiste(
    artiste_id: int,
    artiste: ArtisteCreate,
    db: AsyncSession = Depends(get_db),
):
    service = ArtisteService(db)
    updated_artiste = await service.update_artiste(artiste_id, artiste)
    if not updated_artiste:
        raise HTTPException(status_code=404, detail="Artiste not found.")
    return updated_artiste


@router.delete("/artistes/{artiste_id}", status_code=200, summary="Delete an artiste")
async def delete_artiste(
    artiste_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = ArtisteService(db)
    artiste = await service.get_artiste(artiste_id)
    if not artiste:
        raise HTTPException(status_code=404, detail="Artiste not found.")
    await service.delete_artiste(artiste_id)
    return {"message": "Artiste deleted successfully."}