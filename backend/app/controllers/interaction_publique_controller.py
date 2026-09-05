from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.interaction_publique import InteractionPubliqueCreate, InteractionPubliqueResponse
from app.services.interaction_publique_service import InteractionPubliqueService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["interactions"])


@router.post(
    "/interactions",
    response_model=InteractionPubliqueResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new interaction (like, commentaire, favori)",
)
async def create_interaction(
    interaction: InteractionPubliqueCreate,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = InteractionPubliqueService(db)
    participant_id = auth_data.get("user_id")
    return await service.create_interaction(interaction, participant_id)


@router.get(
    "/propositions/{proposition_id}/interactions",
    response_model=List[InteractionPubliqueResponse],
    summary="Get all interactions for a proposition",
)
async def get_interactions_by_proposition(
    proposition_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = InteractionPubliqueService(db)
    return await service.get_interactions_by_proposition(proposition_id)


@router.delete("/interactions/{interaction_id}", status_code=200, summary="Delete an interaction")
async def delete_interaction(
    interaction_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = InteractionPubliqueService(db)
    interaction = await service.get_interaction(interaction_id)
    if not interaction:
        raise HTTPException(status_code=404, detail="Interaction not found.")
    if interaction.participant_id != auth_data.get("user_id") and auth_data.get("concert_id") != 0:
        raise HTTPException(status_code=403, detail="Access denied for this interaction.")
    await service.delete_interaction(interaction_id)
    return {"message": "Interaction deleted successfully."}