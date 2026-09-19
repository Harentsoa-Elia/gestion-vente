from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Dict, Optional

from app.models.evenement import Evenement
from app.models.proposition import Proposition
from app.models.interaction_publique import InteractionPublique
from app.models.recommandation import Recommandation
from app.utils.scoring import POIDS_INTERACTION
from app.models.billet import Billet


class DashboardService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_taux_remplissage(self, evenement_id: int) -> Optional[float]:
        from app.models.reservation import Reservation

        result_evenement = await self.db.execute(
            select(Evenement).filter(Evenement.id == evenement_id)
        )
        evenement = result_evenement.scalar_one_or_none()
        if not evenement or not evenement.capacite or evenement.capacite <= 0:
            return None

        result_reservations = await self.db.execute(
            select(func.count(Reservation.id)).filter(
                Reservation.evenement_id == evenement_id,
                Reservation.statut == "confirmee",
            )
        )
        nb_reservations_confirmees = result_reservations.scalar() or 0

        taux = (nb_reservations_confirmees / evenement.capacite) * 100
        return round(min(taux, 100), 2)

    async def get_billets_scan_stats(self, evenement_id: int) -> Dict:
        from app.models.reservation import Reservation

        result = await self.db.execute(
            select(Billet.is_used)
            .join(Reservation, Billet.reservation_id == Reservation.id)
            .filter(Reservation.evenement_id == evenement_id)
        )
        etats = result.scalars().all()

        total = len(etats)
        scannes = sum(1 for e in etats if e)
        non_scannes = total - scannes

        return {"total": total, "scannes": scannes, "non_scannes": non_scannes}

    async def get_score_total_evenement(self, evenement_id: int) -> int:
        result = await self.db.execute(
            select(Proposition.id).filter(Proposition.evenement_id == evenement_id)
        )
        proposition_ids = [row[0] for row in result.all()]

        if not proposition_ids:
            return 0

        interactions_result = await self.db.execute(
            select(InteractionPublique.type_interaction).filter(
                InteractionPublique.proposition_id.in_(proposition_ids)
            )
        )
        interactions = interactions_result.scalars().all()

        return sum(POIDS_INTERACTION.get(i, 0) for i in interactions)

    async def get_evenements_populaires(self, organisateur_id: int, limit: int = 5) -> List[Dict]:
        result = await self.db.execute(
            select(Evenement).filter(Evenement.organisateur_id == organisateur_id)
        )
        evenements = result.scalars().all()

        resultats = []
        for evenement in evenements:
            score = await self.get_score_total_evenement(evenement.id)
            resultats.append({
                "id": evenement.id,
                "titre": evenement.titre,
                "score_popularite": score,
            })

        resultats.sort(key=lambda x: x["score_popularite"], reverse=True)
        return resultats[:limit]

    async def get_dashboard_evenement(self, evenement_id: int) -> Dict:
        result = await self.db.execute(
            select(Evenement).filter(Evenement.id == evenement_id)
        )
        evenement = result.scalar_one_or_none()
        if not evenement:
            return {}

        taux_remplissage = await self.get_taux_remplissage(evenement_id)
        score_popularite = await self.get_score_total_evenement(evenement_id)
        billets_scan = await self.get_billets_scan_stats(evenement_id)

        recommandation_result = await self.db.execute(
            select(Recommandation).filter(Recommandation.evenement_id == evenement_id)
        )
        recommandation = recommandation_result.scalar_one_or_none()

        return {
            "evenement_id": evenement.id,
            "titre": evenement.titre,
            "capacite": evenement.capacite,
            "taux_remplissage": taux_remplissage,
            "score_popularite": score_popularite,
            "niveau_interet_estime": recommandation.niveau_interet_estime if recommandation else None,
            "participation_estimee": recommandation.participation_estimee if recommandation else None,
            "billets_total": billets_scan["total"],
            "billets_scannes": billets_scan["scannes"],
            "billets_non_scannes": billets_scan["non_scannes"],
        }