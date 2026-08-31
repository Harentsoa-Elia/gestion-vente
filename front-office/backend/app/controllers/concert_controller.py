from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.schemas.concert import ConcertCreate, ConcertResponse
from app.services.concert_service import ConcertService
from typing import List

from app.database import get_db

router = APIRouter()

@router.post("/concerts", response_model=ConcertResponse, status_code=status.HTTP_201_CREATED, summary="Create a new concert configuration")
async def create_concert(concert: ConcertCreate, db: AsyncSession = Depends(get_db)):
    """
    Creates a new concert configuration with a unique code.
    The concert code will be used as a prefix for generated ticket IDs.
    """
    service = ConcertService(db)
    existing_concert = await service.get_concert_by_code(concert.code)
    if existing_concert:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Concert code already exists. Please use a different code.")
    return await service.create_concert(concert)

@router.get("/concerts", response_model=List[ConcertResponse], summary="Get all concert configurations")
async def get_all_concerts(db: AsyncSession = Depends(get_db)):
    """
    Retrieves a list of all available concert configurations.
    """
    service = ConcertService(db)
    return await service.get_all_concerts()

@router.get("/concerts/{concert_id}", response_model=ConcertResponse, summary="Get a specific concert configuration by ID")
async def get_concert(concert_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieves a single concert configuration by its unique ID.
    """
    service = ConcertService(db)
    concert = await service.get_concert(concert_id)
    if not concert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Concert not found")
    return concert

@router.put("/concerts/{concert_id}", response_model=ConcertResponse, summary="Update an existing concert configuration")
async def update_concert(concert_id: int, concert: ConcertCreate, db: AsyncSession = Depends(get_db)):
    """
    Updates an existing concert configuration.
    Note: Changing the 'code' of an existing concert will not affect already generated ticket IDs.
    """
    service = ConcertService(db)
    updated_concert = await service.update_concert(concert_id, concert)
    if not updated_concert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Concert not found")
    return updated_concert
