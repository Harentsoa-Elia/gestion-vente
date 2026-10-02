"""Réservation de plusieurs billets, paiement Mobile Money SIMULÉ et billets électroniques.

Aucun opérateur n'est contacté : le paiement est accepté dès que le numéro correspond
à l'opérateur choisi. Chaque billet est une réservation (1 réservation = 1 billet = 1 QR code),
comme dans le reste de l'application (tableaux de bord, contrôle à l'entrée).
"""
import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billet import Billet
from app.models.categorie_billet import CategorieBillet
from app.models.evenement import Evenement
from app.models.lieu import Lieu
from app.models.notification import Notification
from app.models.paiement import Paiement
from app.models.participant import Participant
from app.models.reservation import Reservation
from app.utils.crypto import encrypt_data

# une réservation non payée garde sa place 15 minutes
DUREE_RESERVATION = timedelta(minutes=15)

# préfixes des numéros malgaches par opérateur (paiement simulé : simple contrôle de cohérence)
PREFIXES = {"mvola": ("034", "038"), "orange_money": ("032", "037"), "airtel_money": ("033",)}
NOMS_OPERATEURS = {"mvola": "MVola", "orange_money": "Orange Money", "airtel_money": "Airtel Money"}


class ErreurBilletterie(ValueError):
    pass


def maintenant() -> datetime:
    return datetime.now(timezone.utc)


def normaliser_telephone(telephone: str) -> str:
    """« +261 34 12 345 67 », « 034 12 345 67 »… -> « 0341234567 »."""
    chiffres = re.sub(r"\D", "", telephone or "")
    if chiffres.startswith("261"):
        chiffres = "0" + chiffres[3:]
    return chiffres


def verifier_telephone(mode: str, telephone: str) -> str:
    numero = normaliser_telephone(telephone)
    if not re.fullmatch(r"03[2-8]\d{7}", numero):
        raise ErreurBilletterie("Numéro invalide : saisissez un numéro malgache à 10 chiffres, ex. 034 12 345 67.")
    if not numero.startswith(PREFIXES[mode]):
        prefixes = " ou ".join(PREFIXES[mode])
        raise ErreurBilletterie(f"Ce numéro n'est pas un numéro {NOMS_OPERATEURS[mode]} (il doit commencer par {prefixes}).")
    return numero


class BilletterieService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def places_prises(self, categorie_id: int) -> int:
        """Billets payés + réservations en attente encore valables."""
        limite = maintenant() - DUREE_RESERVATION
        result = await self.db.execute(
            select(func.count(Reservation.id)).where(
                Reservation.categorie_billet_id == categorie_id,
                or_(Reservation.statut == "confirmee", and_(Reservation.statut == "en_attente", Reservation.date_reservation >= limite)),
            )
        )
        return result.scalar() or 0

    async def tarifs(self, evenement_id: int) -> List[dict]:
        """Tarifs d'un événement avec les places restantes (None = sans limite)."""
        result = await self.db.execute(
            select(CategorieBillet).where(CategorieBillet.evenement_id == evenement_id).order_by(CategorieBillet.prix, CategorieBillet.id)
        )
        tarifs = []
        for c in result.scalars().all():
            restantes = None
            if c.quantite_disponible is not None:
                restantes = max(0, c.quantite_disponible - await self.places_prises(c.id))
            tarifs.append({"id": c.id, "nom": c.nom, "prix": c.prix, "quantite_disponible": c.quantite_disponible, "restantes": restantes})
        return tarifs

    async def reserver(self, participant_id: int, evenement_id: int, categorie_id: int, quantite: int):
        evenement = await self.db.get(Evenement, evenement_id)
        if not evenement:
            raise ErreurBilletterie("Événement introuvable.")
        if evenement.statut_validation != "valide":
            raise ErreurBilletterie("La billetterie de cet événement n'est pas encore ouverte.")
        if evenement.date_debut and evenement.date_debut < maintenant():
            raise ErreurBilletterie("Cet événement est déjà passé.")
        categorie = await self.db.get(CategorieBillet, categorie_id)
        if not categorie or categorie.evenement_id != evenement_id:
            raise ErreurBilletterie("Ce tarif n'existe pas pour cet événement.")
        if categorie.quantite_disponible is not None:
            restantes = categorie.quantite_disponible - await self.places_prises(categorie_id)
            if restantes <= 0:
                raise ErreurBilletterie(f"Plus de places « {categorie.nom} » disponibles.")
            if quantite > restantes:
                reste = "qu'une place" if restantes == 1 else f"que {restantes} places"
                raise ErreurBilletterie(f"Il ne reste {reste} « {categorie.nom} ».")

        reservations = [
            Reservation(evenement_id=evenement_id, categorie_billet_id=categorie_id, participant_id=participant_id, statut="en_attente")
            for _ in range(quantite)
        ]
        self.db.add_all(reservations)
        await self.db.commit()
        for r in reservations:
            await self.db.refresh(r)
        return evenement, categorie, reservations

    async def payer(self, participant_id: int, reservation_ids: List[int], mode: str, telephone: str):
        verifier_telephone(mode, telephone)
        result = await self.db.execute(select(Reservation).where(Reservation.id.in_(reservation_ids)))
        reservations = result.scalars().all()
        if len(reservations) != len(set(reservation_ids)):
            raise ErreurBilletterie("Réservation introuvable.")
        if any(r.participant_id != participant_id for r in reservations):
            raise ErreurBilletterie("Ces réservations ne sont pas les vôtres.")
        if any(r.statut == "confirmee" for r in reservations):
            raise ErreurBilletterie("Une de ces réservations est déjà payée.")
        if len({(r.evenement_id, r.categorie_billet_id) for r in reservations}) != 1:
            raise ErreurBilletterie("Payez les billets d'un même événement et d'un même tarif ensemble.")

        premiere = reservations[0]
        categorie = await self.db.get(CategorieBillet, premiere.categorie_billet_id)
        evenement = await self.db.get(Evenement, premiere.evenement_id)
        # réservation expirée : on vérifie qu'il reste de la place avant d'encaisser
        expirees = [r for r in reservations if r.date_reservation and r.date_reservation < maintenant() - DUREE_RESERVATION]
        if expirees and categorie.quantite_disponible is not None:
            if categorie.quantite_disponible - await self.places_prises(categorie.id) < len(expirees):
                raise ErreurBilletterie("Le délai de réservation est dépassé et il n'y a plus assez de places.")

        reference = f"SIM-{uuid.uuid4().hex[:8].upper()}"
        date_paiement = maintenant()
        billets: List[Billet] = []
        for r in reservations:
            self.db.add(
                Paiement(montant=categorie.prix, statut_paiement="paye", mode_paiement=mode, date_paiement=date_paiement, reservation_id=r.id)
            )
            r.statut = "confirmee"
            numero = f"BLT-{uuid.uuid4().hex[:10].upper()}"
            billet = Billet(numero_billet=numero, qr_code=encrypt_data(numero), is_used=False, reservation_id=r.id)
            self.db.add(billet)
            billets.append(billet)

        n = len(reservations)
        self.db.add(
            Notification(
                organisateur_id=evenement.organisateur_id,
                message=f"{n} billet{'s' if n > 1 else ''} « {categorie.nom} » vendu{'s' if n > 1 else ''} pour '{evenement.titre}' ({categorie.prix * n:.0f} Ar).",
                lu=False,
                reservation_id=premiere.id,
            )
        )
        await self.db.commit()
        return reference, categorie.prix * n, [r.id for r in reservations]

    async def annuler(self, participant_id: int, reservation_id: int) -> None:
        r = await self.db.get(Reservation, reservation_id)
        if not r or r.participant_id != participant_id:
            raise ErreurBilletterie("Réservation introuvable.")
        if r.statut != "en_attente":
            raise ErreurBilletterie("Un billet payé ne peut pas être annulé ici.")
        await self.db.delete(r)
        await self.db.commit()

    async def billets_participant(self, participant_id: int, reservation_ids: Optional[List[int]] = None) -> List[dict]:
        requete = (
            select(Reservation, Evenement, CategorieBillet, Lieu, Paiement, Billet)
            .join(Evenement, Reservation.evenement_id == Evenement.id)
            .join(CategorieBillet, Reservation.categorie_billet_id == CategorieBillet.id)
            .outerjoin(Lieu, Evenement.lieu_id == Lieu.id)
            .outerjoin(Paiement, Paiement.reservation_id == Reservation.id)
            .outerjoin(Billet, Billet.reservation_id == Reservation.id)
            .where(Reservation.participant_id == participant_id)
            .order_by(Evenement.date_debut.desc(), Reservation.id)
        )
        if reservation_ids is not None:
            requete = requete.where(Reservation.id.in_(reservation_ids))
        lignes = (await self.db.execute(requete)).all()
        resultat = []
        for r, e, c, l, p, b in lignes:
            # une réservation abandonnée depuis plus de 15 minutes n'est plus proposée
            expire = r.date_reservation + DUREE_RESERVATION if r.statut == "en_attente" and r.date_reservation else None
            if r.statut == "en_attente" and expire and expire < maintenant() and reservation_ids is None:
                continue
            resultat.append(
                {
                    "reservation_id": r.id,
                    "statut": r.statut,
                    "date_reservation": r.date_reservation,
                    "expire_le": expire,
                    "evenement_id": e.id,
                    "evenement_titre": e.titre,
                    "evenement_date": e.date_debut,
                    "evenement_image": e.image_url,
                    "lieu": ", ".join(x for x in [l.nom, l.ville] if x) if l else None,
                    "categorie_nom": c.nom,
                    "prix": c.prix,
                    "mode_paiement": p.mode_paiement if p else None,
                    "date_paiement": p.date_paiement if p else None,
                    "numero_billet": b.numero_billet if b else None,
                    "qr_code": b.qr_code if b else None,
                    "utilise": bool(b.is_used) if b else False,
                    "date_scan": b.date_scan if b else None,
                }
            )
        return resultat

    async def participant(self, participant_id: int) -> Optional[Participant]:
        return await self.db.get(Participant, participant_id)
