from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Dict, Optional

from app.models.evenement import Evenement
from app.models.proposition import Proposition
from app.models.interaction_publique import InteractionPublique
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

    async def get_dashboard_organisateur(self, organisateur_id: int) -> Dict:
        from app.models.reservation import Reservation
        from app.models.paiement import Paiement
        from app.models.categorie_billet import CategorieBillet

        result_ev = await self.db.execute(
            select(Evenement).filter(Evenement.organisateur_id == organisateur_id)
        )
        evenements = result_ev.scalars().all()
        evenement_ids = [e.id for e in evenements]
        evenements_publies = sum(1 for e in evenements if e.statut_validation == "valide")

        if not evenement_ids:
            return {
                "evenements_publies": 0,
                "billets_vendus": 0,
                "taux_remplissage_moyen": 0.0,
                "recettes_totales": 0.0,
                "ventes_par_jour": [],
                "categories_populaires": [],
                "reservations_confirmees": 0,
                "hors_ligne": None,
            }

        result_billets = await self.db.execute(
            select(func.count(Billet.id))
            .join(Reservation, Billet.reservation_id == Reservation.id)
            .filter(Reservation.evenement_id.in_(evenement_ids))
        )
        billets_vendus = result_billets.scalar() or 0

        result_recettes = await self.db.execute(
            select(func.coalesce(func.sum(Paiement.montant), 0.0))
            .join(Reservation, Paiement.reservation_id == Reservation.id)
            .filter(
                Reservation.evenement_id.in_(evenement_ids),
                Paiement.statut_paiement == "paye",
            )
        )
        recettes_totales = result_recettes.scalar() or 0.0

        taux_list = []
        for e in evenements:
            if e.statut_validation == "valide" and e.capacite and e.capacite > 0:
                t = await self.get_taux_remplissage(e.id)
                if t is not None:
                    taux_list.append(t)
        taux_remplissage_moyen = round(sum(taux_list) / len(taux_list), 2) if taux_list else 0.0

        result_ventes = await self.db.execute(
            select(func.date(Reservation.date_reservation), func.count(Reservation.id))
            .filter(
                Reservation.evenement_id.in_(evenement_ids),
                Reservation.statut == "confirmee",
            )
            .group_by(func.date(Reservation.date_reservation))
            .order_by(func.date(Reservation.date_reservation))
        )
        ventes_par_jour = [
            {"date": str(row[0]), "nombre": row[1]} for row in result_ventes.all()
        ]

        # Billets confirmés par tarif : un tarif appartient à un événement (« Entrée » du concert
        # n'est pas « Entrée » du stand-up), on regroupe donc par événement ET par tarif.
        result_categories = await self.db.execute(
            select(CategorieBillet.nom, Evenement.titre, func.count(Reservation.id))
            .join(Reservation, Reservation.categorie_billet_id == CategorieBillet.id)
            .join(Evenement, Evenement.id == Reservation.evenement_id)
            .filter(
                Reservation.evenement_id.in_(evenement_ids),
                Reservation.statut == "confirmee",
            )
            .group_by(CategorieBillet.id, CategorieBillet.nom, Evenement.titre)
            .order_by(func.count(Reservation.id).desc())
            .limit(6)
        )
        categories_populaires = [
            {"categorie": row[0], "evenement": row[1], "nombre": row[2]} for row in result_categories.all()
        ]
        reservations_confirmees = (await self.db.execute(
            select(func.count(Reservation.id)).filter(
                Reservation.evenement_id.in_(evenement_ids),
                Reservation.statut == "confirmee",
            )
        )).scalar() or 0

        # billets hors ligne (dépôt-vente, guichet, invitations) : mêmes chiffres que les Statistiques
        from app.services.statistiques_service import StatistiquesService

        hl = await StatistiquesService(self.db)._hors_ligne(evenement_ids)
        hors_ligne = {k: v for k, v in hl.items() if not k.startswith("_")} if hl["emis"] else None

        return {
            "evenements_publies": evenements_publies,
            "billets_vendus": billets_vendus,
            "taux_remplissage_moyen": taux_remplissage_moyen,
            "recettes_totales": recettes_totales,
            "ventes_par_jour": ventes_par_jour,
            "categories_populaires": categories_populaires,
            "reservations_confirmees": reservations_confirmees,
            "hors_ligne": hors_ligne,
        }
