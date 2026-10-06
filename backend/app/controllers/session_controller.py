"""Rafraîchissement automatique de la session (voir app/services/session_service.py)."""
from fastapi import APIRouter, Body, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.services.session_service import SessionInvalide, SessionService

router = APIRouter(tags=["session"])


class JetonRafraichissementSaisie(BaseModel):
    refresh_token: str = Field(..., min_length=20, max_length=200)


@router.post(
    "/auth/rafraichir",
    summary="Nouveau jeton d'accès à partir du jeton de rafraîchissement (rotation)",
)
async def rafraichir(saisie: JetonRafraichissementSaisie = Body(...), db: AsyncSession = Depends(get_db)):
    try:
        return await SessionService(db).rafraichir(saisie.refresh_token)
    except SessionInvalide as e:
        raise HTTPException(status_code=401, detail=str(e))


@router.post("/auth/deconnexion", summary="Fermer la session liée à un jeton de rafraîchissement")
async def deconnexion(saisie: JetonRafraichissementSaisie = Body(...), db: AsyncSession = Depends(get_db)):
    await SessionService(db).fermer(saisie.refresh_token)
    return {"message": "Session fermée."}
