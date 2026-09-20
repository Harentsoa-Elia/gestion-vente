from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.schemas.notification import NotificationResponse, NotificationCountResponse
from app.services.notification_service import NotificationService
from app.auth.auth_bearer import JWTBearer
from app.database import get_db

router = APIRouter(tags=["notifications"])


@router.get(
    "/notifications",
    response_model=List[NotificationResponse],
    summary="Lister les notifications du staff/organisateur connecte",
)
async def list_notifications(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    user_id = auth_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=403, detail="Utilisateur non identifie.")
    service = NotificationService(db)
    return await service.list_notifications(user_id)


@router.get(
    "/notifications/count",
    response_model=NotificationCountResponse,
    summary="Compter les notifications non lues (utilise pour le polling)",
)
async def count_notifications(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    user_id = auth_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=403, detail="Utilisateur non identifie.")
    service = NotificationService(db)
    non_lues = await service.count_non_lues(user_id)
    return NotificationCountResponse(non_lues=non_lues)


@router.post(
    "/notifications/marquer-lues",
    summary="Marquer toutes les notifications de l'utilisateur comme lues",
)
async def marquer_notifications_lues(
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db),
):
    user_id = auth_data.get("user_id")
    if not user_id:
        raise HTTPException(status_code=403, detail="Utilisateur non identifie.")
    service = NotificationService(db)
    nb = await service.marquer_comme_lues(user_id)
    return {"marquees_lues": nb}