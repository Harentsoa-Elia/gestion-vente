from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from app.models.reservation import Reservation
from app.models.paiement import Paiement
from app.models.billet import Billet
from app.models.evenement import Evenement
from app.schemas.reservation import ReservationCreate
from app.utils.crypto import encrypt_data


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

        db_reservation = Reservation(
            evenement_id=reservation.evenement_id,
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
            select(Evenement).filter(Evenement.id == reservation.evenement_id)
        )
        evenement = result.scalar_one_or_none()
        montant = evenement.prix_billet if evenement and evenement.prix_billet else 0.0

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