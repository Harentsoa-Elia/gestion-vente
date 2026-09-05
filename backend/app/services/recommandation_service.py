from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
from collections import defaultdict

from app.models.recommandation import Recommandation
from app.models.proposition import Proposition, PropositionType
from app.models.interaction_publique import InteractionPublique, InteractionType
from app.models.lieu import Lieu

POIDS_INTERACTION = {
    InteractionType.LIKE: 1,
    InteractionType.FAVORI: 2,
    InteractionType.COMMENTAIRE: 3,
}


class RecommandationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_recommandation(self, evenement_id: int) -> Optional[Recommandation]:
        result = await self.db.execute(
            select(Recommandation).filter(Recommandation.evenement_id == evenement_id)
        )
        return result.scalar_one_or_none()

    async def _get_propositions_avec_scores(self, evenement_id: int, type_proposition: PropositionType):
        result = await self.db.execute(
            select(Proposition).filter(
                Proposition.evenement_id == evenement_id,
                Proposition.type == type_proposition,
            )
        )
        propositions = result.scalars().all()

        scores = {}
        for proposition in propositions:
            result_interactions = await self.db.execute(
                select(InteractionPublique).filter(
                    InteractionPublique.proposition_id == proposition.id
                )
            )
            interactions = result_interactions.scalars().all()
            score = sum(POIDS_INTERACTION[i.type_interaction] for i in interactions)
            scores[proposition.id] = {"proposition": proposition, "score": score}

        return scores

    async def calculer_recommandation(self, evenement_id: int) -> Recommandation:
        scores_artistes = await self._get_propositions_avec_scores(evenement_id, PropositionType.ARTISTE)
        scores_lieux = await self._get_propositions_avec_scores(evenement_id, PropositionType.LIEU)
        scores_categories = await self._get_propositions_avec_scores(evenement_id, PropositionType.CATEGORIE)

        if not scores_lieux:
            raise ValueError("Aucune proposition de lieu trouvee pour cet evenement.")

        artiste_gagnant = max(scores_artistes.values(), key=lambda x: x["score"], default=None)
        lieu_gagnant = max(scores_lieux.values(), key=lambda x: x["score"])
        categorie_gagnante = max(scores_categories.values(), key=lambda x: x["score"], default=None)

        total_score_artistes = sum(v["score"] for v in scores_artistes.values())
        if total_score_artistes > 0 and artiste_gagnant:
            niveau_interet = (artiste_gagnant["score"] / total_score_artistes) * 100
        else:
            niveau_interet = 0

        result_lieu = await self.db.execute(
            select(Lieu).filter(Lieu.id == lieu_gagnant["proposition"].lieu_id)
        )
        lieu = result_lieu.scalar_one_or_none()
        capacite_lieu = lieu.capacite if lieu and lieu.capacite else 0
        participation_estimee = int(capacite_lieu * (niveau_interet / 100))

        recommandation = await self.get_recommandation(evenement_id)
        if recommandation is None:
            recommandation = Recommandation(evenement_id=evenement_id)
            self.db.add(recommandation)

        recommandation.artiste_id = artiste_gagnant["proposition"].artiste_id if artiste_gagnant else None
        recommandation.lieu_id = lieu_gagnant["proposition"].lieu_id
        recommandation.categorie_id = categorie_gagnante["proposition"].categorie_id if categorie_gagnante else None
        recommandation.niveau_interet_estime = round(niveau_interet, 2)
        recommandation.participation_estimee = participation_estimee

        await self.db.commit()
        await self.db.refresh(recommandation)
        return recommandation