from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.models.proposition import Proposition
from app.models.evenement import Evenement
from app.schemas.proposition import PropositionCreate


class PropositionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_proposition(self, proposition: PropositionCreate) -> Proposition:
        db_proposition = Proposition(**proposition.dict())
        self.db.add(db_proposition)
        await self.db.commit()
        await self.db.refresh(db_proposition)
        return db_proposition

    async def get_proposition(self, proposition_id: int) -> Optional[Proposition]:
        result = await self.db.execute(select(Proposition).filter(Proposition.id == proposition_id))
        return result.scalar_one_or_none()

    async def get_propositions_by_evenement(self, evenement_id: int) -> List[Proposition]:
        result = await self.db.execute(select(Proposition).filter(Proposition.evenement_id == evenement_id))
        return result.scalars().all()

    async def get_evenement_organisateur(self, evenement_id: int) -> Optional[int]:
        result = await self.db.execute(select(Evenement).filter(Evenement.id == evenement_id))
        evenement = result.scalar_one_or_none()
        return evenement.organisateur_id if evenement else None

    async def delete_proposition(self, proposition_id: int):
        db_proposition = await self.get_proposition(proposition_id)
        if db_proposition:
            await self.db.delete(db_proposition)
            await self.db.commit()