from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, timezone
from sqlalchemy.orm import joinedload
import uuid

from app.models.reservation import Reservation
from app.models.paiement import Paiement
from app.models.billet import Billet
from app.models.evenement import Evenement
from app.models.categorie_billet import CategorieBillet
from app.schemas.reservation import ReservationCreate
from app.utils.crypto import encrypt_data
from app.models.notification import Notification
from app.models.participant import Participant


class ReservationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_reservation(self, reservation: ReservationCreate, participant_id: int) -> Reservation:
        result = await self.db.execute(
            select(Evenement).filter(Evenement.id == reservation.evenement_id)
        )
        evenement = result.scalar_one_or_none()
        if not evenement:
            raise ValueError("Evenement not found.")

        result_categorie = await self.db.execute(
            select(CategorieBillet).filter(CategorieBillet.id == reservation.categorie_billet_id)
        )
        categorie = result_categorie.scalar_one_or_none()
        if not categorie:
            raise ValueError("Categorie de billet not found.")
        if categorie.evenement_id != reservation.evenement_id:
            raise ValueError("Cette categorie de billet n'appartient pas a cet evenement.")

        if categorie.quantite_disponible is not None:
            result_count = await self.db.execute(
                select(func.count(Reservation.id)).filter(
                    Reservation.categorie_billet_id == categorie.id
                )
            )
            nb_reservees = result_count.scalar() or 0
            if nb_reservees >= categorie.quantite_disponible:
                raise ValueError("Plus de places disponibles pour cette categorie de billet.")

        db_reservation = Reservation(
            evenement_id=reservation.evenement_id,
            categorie_billet_id=reservation.categorie_billet_id,
            participant_id=participant_id,
            statut="en_attente",
        )
        self.db.add(db_reservation)
        await self.db.commit()
        await self.db.refresh(db_reservation)
        return db_reservation

    async def get_reservation(self, reservation_id: int) -> Optional[Reservation]:
        result = await self.db.execute(
            select(Reservation).filter(Reservation.id == reservation_id)
        )
        return result.scalar_one_or_none()

    async def get_reservations_by_participant(self, participant_id: int) -> List[Reservation]:
        result = await self.db.execute(
            select(Reservation).filter(Reservation.participant_id == participant_id)
        )
        return result.scalars().all()

    async def payer_reservation(self, reservation_id: int) -> Paiement:
        reservation = await self.get_reservation(reservation_id)
        if not reservation:
            raise ValueError("Reservation not found.")
        if reservation.statut == "confirmee":
            raise ValueError("Reservation deja payee.")

        result = await self.db.execute(
            select(CategorieBillet).filter(CategorieBillet.id == reservation.categorie_billet_id)
        )
        categorie = result.scalar_one_or_none()
        montant = categorie.prix if categorie else 0.0

        paiement = Paiement(
            montant=montant,
            statut_paiement="paye",
            mode_paiement="simulation",
            date_paiement=datetime.now(timezone.utc),
            reservation_id=reservation_id,
        )
        self.db.add(paiement)

        reservation.statut = "confirmee"
        self.db.add(reservation)
        # Recupere l'evenement pour identifier son organisateur et son titre,
        # afin de creer la notification qui lui est destinee.
        result_evenement = await self.db.execute(
            select(Evenement).filter(Evenement.id == reservation.evenement_id)
        )
        evenement = result_evenement.scalar_one_or_none()
        if evenement:
             notification = Notification(
                organisateur_id=evenement.organisateur_id,
                message=f"Nouvelle reservation confirmee pour '{evenement.titre}' ({montant:.0f} Ar).",
                lu=False,
                reservation_id=reservation_id,
            )
             self.db.add(notification)

        await self.db.commit()
        await self.db.refresh(paiement)

        await self.generer_billet(reservation_id)

        return paiement

    async def generer_billet(self, reservation_id: int) -> Billet:
        numero_billet = f"BLT-{uuid.uuid4().hex[:10].upper()}"
        qr_data = encrypt_data(numero_billet)

        billet = Billet(
            numero_billet=numero_billet,
            qr_code=qr_data,
            is_used=False,
            reservation_id=reservation_id,
        )
        self.db.add(billet)
        await self.db.commit()
        await self.db.refresh(billet)
        return billet

    async def get_billet_by_reservation(self, reservation_id: int) -> Optional[Billet]:
        result = await self.db.execute(
            select(Billet).filter(Billet.reservation_id == reservation_id)
        )
        return result.scalar_one_or_none()

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