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
        if not db_evenement:
            return

        from app.models.proposition import Proposition
        from app.models.recommandation import Recommandation
        from app.models.reservation import Reservation
        from app.models.paiement import Paiement
        from app.models.billet import Billet
        from app.models.interaction_publique import InteractionPublique

        propositions_result = await self.db.execute(
            select(Proposition).filter(Proposition.evenement_id == evenement_id)
        )
        propositions = propositions_result.scalars().all()
        proposition_ids = [p.id for p in propositions]

        if proposition_ids:
            interactions_result = await self.db.execute(
                select(InteractionPublique).filter(
                    InteractionPublique.proposition_id.in_(proposition_ids)
                )
            )
            for interaction in interactions_result.scalars().all():
                await self.db.delete(interaction)

        for proposition in propositions:
            await self.db.delete(proposition)

        recommandation_result = await self.db.execute(
            select(Recommandation).filter(Recommandation.evenement_id == evenement_id)
        )
        recommandation = recommandation_result.scalar_one_or_none()
        if recommandation:
            await self.db.delete(recommandation)

        reservations_result = await self.db.execute(
            select(Reservation).filter(Reservation.evenement_id == evenement_id)
        )
        reservations = reservations_result.scalars().all()

        for reservation in reservations:
            paiement_result = await self.db.execute(
                select(Paiement).filter(Paiement.reservation_id == reservation.id)
            )
            paiement = paiement_result.scalar_one_or_none()
            if paiement:
                await self.db.delete(paiement)

            billet_result = await self.db.execute(
                select(Billet).filter(Billet.reservation_id == reservation.id)
            )
            billet = billet_result.scalar_one_or_none()
            if billet:
                await self.db.delete(billet)

            await self.db.delete(reservation)

        await self.db.delete(db_evenement)
        await self.db.commit()