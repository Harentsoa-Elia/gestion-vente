from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List
from datetime import datetime, timezone

from app.models.recommandation import Recommandation
from app.models.proposition import Proposition, PropositionType
from app.models.interaction_publique import InteractionPublique, InteractionType
from app.models.lieu import Lieu
from app.utils.scoring import POIDS_INTERACTION

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

    def _pourcentage_gagnant(self, scores: dict, gagnant: Optional[dict]) -> Optional[float]:
        """Retourne le % du score du gagnant sur le total de son type, ou None si aucune proposition."""
        if not scores or not gagnant:
            return None
        total = sum(v["score"] for v in scores.values())
        if total == 0:
            return 0.0
        return (gagnant["score"] / total) * 100

    async def calculer_recommandation(self, evenement_id: int) -> Recommandation:
        scores_artistes = await self._get_propositions_avec_scores(evenement_id, PropositionType.ARTISTE)
        scores_lieux = await self._get_propositions_avec_scores(evenement_id, PropositionType.LIEU)
        scores_categories = await self._get_propositions_avec_scores(evenement_id, PropositionType.CATEGORIE)

        if not scores_lieux:
            raise ValueError("Aucune proposition de lieu trouvee pour cet evenement.")

        artiste_gagnant = max(scores_artistes.values(), key=lambda x: x["score"], default=None)
        lieu_gagnant = max(scores_lieux.values(), key=lambda x: x["score"])
        categorie_gagnante = max(scores_categories.values(), key=lambda x: x["score"], default=None)

        pourcentages = [
            self._pourcentage_gagnant(scores_artistes, artiste_gagnant),
            self._pourcentage_gagnant(scores_lieux, lieu_gagnant),
            self._pourcentage_gagnant(scores_categories, categorie_gagnante),
        ]
        pourcentages_valides = [p for p in pourcentages if p is not None]
        score_engagement_total = sum(
            g["score"] for g in [artiste_gagnant, lieu_gagnant, categorie_gagnante] if g is not None
        )
        niveau_interet = sum(pourcentages_valides) / len(pourcentages_valides) if pourcentages_valides else 0

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
        recommandation.score_engagement_total = score_engagement_total
        recommandation.date_calcul = datetime.now(timezone.utc)

        await self.db.commit()
        await self.db.refresh(recommandation)
        return recommandation