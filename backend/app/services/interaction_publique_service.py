from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from fastapi import HTTPException

from app.ia.sentiment import analyser
from app.models.evenement import Evenement
from app.models.proposition import Proposition
from app.models.interaction_publique import InteractionPublique, InteractionType
from app.schemas.interaction_publique import InteractionPubliqueCreate


class InteractionPubliqueService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_interaction(self, interaction: InteractionPubliqueCreate, participant_id: int) -> InteractionPublique:
        # le public ne réagit qu'aux propositions d'un événement validé (publié)
        statut = (
            await self.db.execute(
                select(Evenement.statut_validation)
                .join(Proposition, Proposition.evenement_id == Evenement.id)
                .where(Proposition.id == interaction.proposition_id)
            )
        ).scalar_one_or_none()
        if statut is None:
            raise HTTPException(status_code=404, detail="Proposition introuvable")
        if statut != "valide":
            raise HTTPException(status_code=400, detail="Cet événement n'est pas publié : impossible d'y réagir")
        db_interaction = InteractionPublique(**interaction.dict(), participant_id=participant_id)
        if db_interaction.type_interaction == InteractionType.COMMENTAIRE:
            analyse = analyser(db_interaction.contenu)  # module d'IA : positif, neutre ou négatif
            if analyse:
                db_interaction.sentiment, db_interaction.confiance = analyse.sentiment, analyse.confiance
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