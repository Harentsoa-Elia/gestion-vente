from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.concert import ConcertCreate, ConcertResponse
from app.services.concert_service import ConcertService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db


router = APIRouter(tags=["concerts"])

# --------------------------------------------------
# Helper : contrôle d'accès
# --------------------------------------------------
def check_access(user_concert_id: int, target_concert_id: int):
    """
    - Si user_concert_id == 0 → admin → accès à tout
    - Sinon, ne peut accéder qu'à son propre concert
    """
    if user_concert_id == 0:
        return True
    if user_concert_id != target_concert_id:
        raise HTTPException(status_code=403, detail="Access denied for this concert.")
    return True

# --------------------------------------------------
# Créer un concert (admin seulement)
# --------------------------------------------------
@router.post(
    "/concerts",
    response_model=ConcertResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new concert configuration (admin only)",
)
async def create_concert(
    concert: ConcertCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    """
    Admins (concert_id = 0) can create new concerts.
    Normal users cannot.
    """
    user_concert_id = auth_data.get("concert_id")
    if user_concert_id != 0:
        raise HTTPException(status_code=403, detail="Only admin can create concerts.")

    service = ConcertService(db)
    existing_concert = await service.get_concert_by_code(concert.code)
    if existing_concert:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Concert code already exists. Please use a different code.",
        )
    return await service.create_concert(concert)

# --------------------------------------------------
# Lister les concerts
# --------------------------------------------------
@router.get("/concerts", response_model=List[ConcertResponse], summary="Get accessible concerts")
async def get_user_concerts(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    """
    - Admin → voit tous les concerts
    - Utilisateur → voit uniquement le sien
    """
    service = ConcertService(db)
    user_concert_id = auth_data.get("concert_id")

    # Admin → tous les concerts
    if user_concert_id == 0:
        return await service.get_all_concerts()

    # Utilisateur normal → un seul concert
    concert = await service.get_concert(user_concert_id)
    if not concert:
        raise HTTPException(status_code=404, detail="Concert not found.")
    return [concert]

# --------------------------------------------------
# Obtenir un concert spécifique
# --------------------------------------------------
@router.get(
    "/concerts/{concert_id}",
    response_model=ConcertResponse,
    summary="Get a specific concert configuration (admin or your concert)",
)
async def get_concert(
    concert_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    """
    Admin → accès à tout
    User → accès uniquement à son concert
    """
    user_concert_id = auth_data.get("concert_id")
    check_access(user_concert_id, concert_id)

    service = ConcertService(db)
    concert = await service.get_concert(concert_id)
    if not concert:
        raise HTTPException(status_code=404, detail="Concert not found.")
    return concert

# --------------------------------------------------
# Mettre à jour un concert
# --------------------------------------------------
@router.put(
    "/concerts/{concert_id}",
    response_model=ConcertResponse,
    summary="Update an existing concert configuration (admin or your concert)",
)
async def update_concert(
    concert_id: int,
    concert: ConcertCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    """
    - Admin → peut tout modifier
    - Utilisateur → ne peut modifier que son propre concert
    """
    user_concert_id = auth_data.get("concert_id")
    check_access(user_concert_id, concert_id)

    service = ConcertService(db)
    updated_concert = await service.update_concert(concert_id, concert)
    if not updated_concert:
        raise HTTPException(status_code=404, detail="Concert not found.")
    return updated_concert



@router.delete(
    "/concerts/{concert_id}",
    status_code=200,
    summary="Delete a concert and all related data (tickets, scan history, users)"
)
async def delete_concert(
    concert_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    # Only admin can delete
    user_concert_id = auth_data.get("concert_id")
    if user_concert_id != 0:
        raise HTTPException(status_code=403, detail="Only admin can delete concerts.")

    service = ConcertService(db)

    # Verify concert exists
    concert = await service.get_concert(concert_id)
    if not concert:
        raise HTTPException(status_code=404, detail="Concert not found.")

    await service.delete_concert(concert_id)

    return {"message": "Concert and all related data have been deleted successfully."}
