from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.categorie_billet import CategorieBilletCreate, CategorieBilletUpdate, CategorieBilletResponse
from app.services.categorie_billet_service import CategorieBilletService
from app.services.evenement_service import EvenementService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["categories-billet"])


async def check_organisateur_evenement(auth_data: dict, evenement_service: EvenementService, evenement_id: int):
    user_concert_id = auth_data.get("concert_id")
    if user_concert_id == 0:
        return True
    evenement = await evenement_service.get_evenement(evenement_id)
    if not evenement:
        raise HTTPException(status_code=404, detail="Evenement not found.")
    if auth_data.get("user_id") != evenement.organisateur_id:
        raise HTTPException(status_code=403, detail="Access denied for this evenement.")
    return True


@router.post(
    "/categories-billet",
    response_model=CategorieBilletResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a ticket category for an evenement (organisateur only)",
)
async def create_categorie_billet(
    data: CategorieBilletCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    evenement_service = EvenementService(db)
    await check_organisateur_evenement(auth_data, evenement_service, data.evenement_id)

    service = CategorieBilletService(db)
    return await service.create_categorie(data)


@router.get(
    "/evenements/{evenement_id}/categories-billet",
    response_model=List[CategorieBilletResponse],
    summary="Get all ticket categories for an evenement (public)",
)
async def get_categories_by_evenement(
    evenement_id: int,
    db: AsyncSession = Depends(get_db),
):
    """Route publique : un visiteur doit voir les categories de billets disponibles avant de reserver."""
    service = CategorieBilletService(db)
    return await service.get_categories_by_evenement(evenement_id)


@router.put(
    "/categories-billet/{categorie_id}",
    response_model=CategorieBilletResponse,
    summary="Update a ticket category (organisateur only)",
)
async def update_categorie_billet(
    categorie_id: int,
    data: CategorieBilletUpdate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = CategorieBilletService(db)
    categorie = await service.get_categorie(categorie_id)
    if not categorie:
        raise HTTPException(status_code=404, detail="Categorie not found.")

    evenement_service = EvenementService(db)
    await check_organisateur_evenement(auth_data, evenement_service, categorie.evenement_id)

    return await service.update_categorie(categorie_id, data)


@router.delete("/categories-billet/{categorie_id}", status_code=200, summary="Delete a ticket category (organisateur only)")
async def delete_categorie_billet(
    categorie_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = CategorieBilletService(db)
    categorie = await service.get_categorie(categorie_id)
    if not categorie:
        raise HTTPException(status_code=404, detail="Categorie not found.")

    evenement_service = EvenementService(db)
    await check_organisateur_evenement(auth_data, evenement_service, categorie.evenement_id)

    await service.delete_categorie(categorie_id)
    return {"message": "Categorie deleted successfully."}