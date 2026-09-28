"""Statistiques de l'espace organisateur (page « Statistiques »)."""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_bearer import JWTBearer
from app.database import get_db
from app.models.evenement import Evenement
from app.schemas.statistiques import Statistiques
from app.services.statistiques_service import StatistiquesService

router = APIRouter(tags=["statistiques"])


@router.get("/organisateur/statistiques", response_model=Statistiques, summary="Statistiques : tous mes événements ou un seul")
async def statistiques(
    evenement_id: Optional[int] = Query(None, description="Un événement ; absent : tous mes événements"),
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    if evenement_id is not None:
        evenement = await db.get(Evenement, evenement_id)
        if not evenement:
            raise HTTPException(status_code=404, detail="Événement introuvable.")
        if auth_data.get("concert_id") != 0 and auth_data.get("user_id") != evenement.organisateur_id:
            raise HTTPException(status_code=403, detail="Cet événement n'est pas le vôtre.")
    return await StatistiquesService(db).calculer(auth_data, evenement_id)
