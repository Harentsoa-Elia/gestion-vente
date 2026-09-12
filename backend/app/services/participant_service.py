from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from passlib.context import CryptContext

from app.models.participant import Participant
from app.schemas.participant import ParticipantSignup, ParticipantUpdate

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


class ParticipantService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_email(self, email: str) -> Optional[Participant]:
        result = await self.db.execute(select(Participant).where(Participant.email == email))
        return result.scalar_one_or_none()

    async def get_by_id(self, participant_id: int) -> Optional[Participant]:
        result = await self.db.execute(select(Participant).where(Participant.id == participant_id))
        return result.scalar_one_or_none()

    async def create_participant(self, data: ParticipantSignup) -> Participant:
        hashed = hash_password(data.mot_de_passe)
        db_participant = Participant(
            nom=data.nom,
            prenom=data.prenom,
            email=data.email,
            mot_de_passe=hashed,
            telephone=data.telephone,
            adresse=data.adresse,
            date_naissance=data.date_naissance,
            genre=data.genre,
            avatar=data.avatar,
        )
        self.db.add(db_participant)
        await self.db.commit()
        await self.db.refresh(db_participant)
        return db_participant

    async def update_participant(self, participant_id: int, data: ParticipantUpdate) -> Optional[Participant]:
        db_participant = await self.get_by_id(participant_id)
        if not db_participant:
            return None
        update_data = data.dict(exclude_unset=True)
        if "mot_de_passe" in update_data and update_data["mot_de_passe"]:
            update_data["mot_de_passe"] = hash_password(update_data["mot_de_passe"])
        for key, value in update_data.items():
            setattr(db_participant, key, value)
        await self.db.commit()
        await self.db.refresh(db_participant)
        return db_participant