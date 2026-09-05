from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.models.evenement import Evenement
from app.schemas.evenement import EvenementCreate


class EvenementService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_evenement(self, evenement: EvenementCreate, organisateur_id: int) -> Evenement:
        db_evenement = Evenement(**evenement.dict(), organisateur_id=organisateur_id)
        self.db.add(db_evenement)
        await self.db.commit()
        await self.db.refresh(db_evenement)
        return db_evenement

    async def get_evenement(self, evenement_id: int) -> Optional[Evenement]:
        result = await self.db.execute(
            select(Evenement).filter(Evenement.id == evenement_id)
        )
        return result.scalar_one_or_none()

    async def get_all_evenements(self) -> List[Evenement]:
        result = await self.db.execute(select(Evenement))
        return result.scalars().all()

    async def update_evenement(
        self, evenement_id: int, evenement_update: EvenementCreate
    ) -> Optional[Evenement]:
        db_evenement = await self.get_evenement(evenement_id)
        if db_evenement:
            for key, value in evenement_update.dict(exclude_unset=True).items():
                setattr(db_evenement, key, value)
            await self.db.commit()
            await self.db.refresh(db_evenement)
        return db_evenement

    async def delete_evenement(self, evenement_id: int):
        db_evenement = await self.get_evenement(evenement_id)
        if db_evenement:
            await self.db.delete(db_evenement)
            await self.db.commit()