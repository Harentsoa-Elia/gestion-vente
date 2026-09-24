from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional, Dict

from app.models.proposition import Proposition
from app.models.evenement import Evenement
from app.models.interaction_publique import InteractionPublique, InteractionType
from app.models.lieu import Lieu
from app.models.artiste import Artiste
from app.models.categorie import Categorie
from app.schemas.proposition import PropositionCreate, PropositionType
from app.utils.scoring import POIDS_INTERACTION


class PropositionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _element_propose(self, proposition: PropositionCreate):
        """Lieu, artiste ou catégorie visé par la proposition (None s'il n'existe pas)."""
        if proposition.type == PropositionType.LIEU:
            return await self.db.get(Lieu, proposition.lieu_id)
        if proposition.type == PropositionType.ARTISTE:
            return await self.db.get(Artiste, proposition.artiste_id)
        return await self.db.get(Categorie, proposition.categorie_id)

    async def create_proposition(self, proposition: PropositionCreate) -> Proposition:
        element = await self._element_propose(proposition)
        if element is None:
            raise ValueError("L'element propose (lieu, artiste ou categorie) n'existe pas.")
        donnees = proposition.dict()
        # sans libellé fourni, on reprend le nom de l'élément proposé
        if not (donnees.get("libelle") or "").strip():
            donnees["libelle"] = element.nom
        db_proposition = Proposition(**donnees)
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

    async def get_propositions_avec_scores(self, evenement_id: int) -> List[Dict]:
        propositions = await self.get_propositions_by_evenement(evenement_id)
        resultats = []
        for proposition in propositions:
            result_interactions = await self.db.execute(
                select(InteractionPublique).filter(
                    InteractionPublique.proposition_id == proposition.id
                )
            )
            interactions = result_interactions.scalars().all()
            score = sum(POIDS_INTERACTION[i.type_interaction] for i in interactions)
            resultats.append({
                "id": proposition.id,
                "type": proposition.type,
                "libelle": proposition.libelle,
                "evenement_id": proposition.evenement_id,
                "artiste_id": proposition.artiste_id,
                "lieu_id": proposition.lieu_id,
                "categorie_id": proposition.categorie_id,
                "date_proposition": proposition.date_proposition,
                "score": score,
            })
        return resultats

    async def get_evenement_organisateur(self, evenement_id: int) -> Optional[int]:
        result = await self.db.execute(select(Evenement).filter(Evenement.id == evenement_id))
        evenement = result.scalar_one_or_none()
        return evenement.organisateur_id if evenement else None

    async def delete_proposition(self, proposition_id: int):
        db_proposition = await self.get_proposition(proposition_id)
        if db_proposition:
            result_interactions = await self.db.execute(
                select(InteractionPublique).filter(
                    InteractionPublique.proposition_id == proposition_id
                )
            )
            for interaction in result_interactions.scalars().all():
                await self.db.delete(interaction)
            await self.db.delete(db_proposition)
            await self.db.commit()