from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.models.interaction_publique import InteractionPublique
from app.schemas.interaction_publique import InteractionPubliqueCreate


class InteractionPubliqueService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_interaction(self, interaction: InteractionPubliqueCreate, participant_id: int) -> InteractionPublique:
        db_interaction = InteractionPublique(**interaction.dict(), participant_id=participant_id)
        self.db.add(db_interaction)
        await self.db.commit()
        await self.db.refresh(db_interaction)
        return db_interaction

    async def get_interaction(self, interaction_id: int) -> Optional[InteractionPublique]:
        result = await self.db.execute(select(InteractionPublique).filter(InteractionPublique.id == interaction_id))
        return result.scalar_one_or_none()

    async def get_interactions_by_proposition(self, proposition_id: int) -> List[InteractionPublique]:
        result = await self.db.execute(
            select(InteractionPublique).filter(InteractionPublique.proposition_id == proposition_id)
        )
        return result.scalars().all()

    async def delete_interaction(self, interaction_id: int):
        db_interaction = await self.get_interaction(interaction_id)
        if db_interaction:
            await self.db.delete(db_interaction)
            await self.db.commit()