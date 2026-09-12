from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.participant import (
    ParticipantSignup,
    ParticipantLogin,
    ParticipantUpdate,
    ParticipantResponse,
)
from app.services.participant_service import ParticipantService, verify_password
from app.auth.auth_handler import sign_jwt_participant
from app.auth.auth_bearer import ParticipantBearer, BLACKLISTED_TOKENS
from app.database import get_db

router = APIRouter(tags=["participants"])


@router.post("/participants/signup", status_code=status.HTTP_201_CREATED)
async def signup_participant(
    data: ParticipantSignup = Body(...),
    db: AsyncSession = Depends(get_db),
):
    service = ParticipantService(db)
    existing = await service.get_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Un compte existe deja avec cet email")
    participant = await service.create_participant(data)
    return sign_jwt_participant(participant.email, participant.id)


@router.post("/participants/login")
async def login_participant(
    data: ParticipantLogin = Body(...),
    db: AsyncSession = Depends(get_db),
):
    service = ParticipantService(db)
    participant = await service.get_by_email(data.email)
    if not participant or not verify_password(data.mot_de_passe, participant.mot_de_passe):
        raise HTTPException(status_code=403, detail="Email ou mot de passe incorrect")
    return sign_jwt_participant(participant.email, participant.id)


@router.post("/participants/logout")
async def logout_participant(auth_data: dict = Depends(ParticipantBearer())):
    token = auth_data["token"]
    BLACKLISTED_TOKENS.add(token)
    return {"message": "Deconnexion reussie"}


@router.get("/participants/me", response_model=ParticipantResponse)
async def get_me(
    auth_data: dict = Depends(ParticipantBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ParticipantService(db)
    participant = await service.get_by_id(auth_data["participant_id"])
    if not participant:
        raise HTTPException(status_code=404, detail="Participant non trouve")
    return participant


@router.put("/participants/me", response_model=ParticipantResponse)
async def update_me(
    data: ParticipantUpdate = Body(...),
    auth_data: dict = Depends(ParticipantBearer()),
    db: AsyncSession = Depends(get_db),
):
    service = ParticipantService(db)
    updated = await service.update_participant(auth_data["participant_id"], data)
    if not updated:
        raise HTTPException(status_code=404, detail="Participant non trouve")
    return updated