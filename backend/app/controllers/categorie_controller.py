from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.categorie import CategorieCreate, CategorieResponse
from app.services.categorie_service import CategorieService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["categories"])


@router.post(
    "/categories",
    response_model=CategorieResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new categorie",
)
async def create_categorie(
    categorie: CategorieCreate,
    db: AsyncSession = Depends(get_db),
):
    service = CategorieService(db)
    return await service.create_categorie(categorie)


@router.get("/categories", response_model=List[CategorieResponse], summary="Get all categories")
async def get_all_categories(
    db: AsyncSession = Depends(get_db),
):
    service = CategorieService(db)
    return await service.get_all_categories()


@router.get("/categories/{categorie_id}", response_model=CategorieResponse, summary="Get a specific categorie")
async def get_categorie(
    categorie_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = CategorieService(db)
    categorie = await service.get_categorie(categorie_id)
    if not categorie:
        raise HTTPException(status_code=404, detail="Categorie not found.")
    return categorie


@router.put("/categories/{categorie_id}", response_model=CategorieResponse, summary="Update a categorie")
async def update_categorie(
    categorie_id: int,
    categorie: CategorieCreate,
    db: AsyncSession = Depends(get_db),
):
    service = CategorieService(db)
    updated_categorie = await service.update_categorie(categorie_id, categorie)
    if not updated_categorie:
        raise HTTPException(status_code=404, detail="Categorie not found.")
    return updated_categorie


@router.delete("/categories/{categorie_id}", status_code=200, summary="Delete a categorie")
async def delete_categorie(
    categorie_id: int,
    db: AsyncSession = Depends(get_db),
):
    service = CategorieService(db)
    categorie = await service.get_categorie(categorie_id)
    if not categorie:
        raise HTTPException(status_code=404, detail="Categorie not found.")
    await service.delete_categorie(categorie_id)
    return {"message": "Categorie deleted successfully."}