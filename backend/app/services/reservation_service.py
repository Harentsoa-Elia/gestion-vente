from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import joinedload

from app.models.reservation import Reservation
from app.models.paiement import Paiement
from app.models.evenement import Evenement
from app.models.participant import Participant


class ReservationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_reservations_by_evenement(self, evenement_id: int):
        result = await self.db.execute(
            select(Reservation)
            .options(joinedload(Reservation.participant), joinedload(Reservation.categorie_billet))
            .where(Reservation.evenement_id == evenement_id)
            .order_by(Reservation.date_reservation.desc())
        )
        return result.scalars().all()

    async def get_participants_by_organisateur(self, organisateur_id: int):
        result = await self.db.execute(
            select(
                Participant.id,
                Participant.nom,
                Participant.prenom,
                Participant.email,
                Participant.telephone,
                func.count(Reservation.id).label("nb_reservations"),
                func.coalesce(func.sum(Paiement.montant), 0).label("montant_total_depense"),
                func.max(Reservation.date_reservation).label("derniere_reservation"),
            )
            .join(Evenement, Reservation.evenement_id == Evenement.id)
            .join(Participant, Reservation.participant_id == Participant.id)
            .outerjoin(Paiement, Paiement.reservation_id == Reservation.id)
            .where(Evenement.organisateur_id == organisateur_id)
            .group_by(Participant.id, Participant.nom, Participant.prenom, Participant.email, Participant.telephone)
            .order_by(func.max(Reservation.date_reservation).desc())
        )
        return result.all()

    async def get_paiements_by_organisateur(self, organisateur_id: int):
        result = await self.db.execute(
            select(
                Paiement.id,
                Paiement.montant,
                Paiement.statut_paiement,
                Paiement.mode_paiement,
                Paiement.date_paiement,
                Evenement.titre.label("evenement_titre"),
                Participant.nom.label("participant_nom"),
                Participant.prenom.label("participant_prenom"),
            )
            .join(Reservation, Paiement.reservation_id == Reservation.id)
            .join(Evenement, Reservation.evenement_id == Evenement.id)
            .join(Participant, Reservation.participant_id == Participant.id)
            .where(Evenement.organisateur_id == organisateur_id)
            .order_by(Paiement.date_paiement.desc())
        )
        return result.all()