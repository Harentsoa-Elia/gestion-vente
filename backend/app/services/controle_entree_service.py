"""Contrôle des billets à l'entrée : l'organisateur scanne le QR code (ou saisit le numéro)
et le billet est marqué utilisé une seule fois, avec l'heure de passage."""
import re
from datetime import datetime, timedelta, timezone
from typing import List, Optional

from sqlalchemy import case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billet import Billet
from app.models.billet_hors_ligne import BilletHorsLigne, LotHorsLigne
from app.models.categorie_billet import CategorieBillet
from app.models.evenement import Evenement
from app.models.lieu import Lieu
from app.models.participant import Participant
from app.models.reservation import Reservation
from app.utils.crypto import decrypt_data
from app.auth.roles import est_admin

MOTIF_NUMERO = re.compile(r"^(?:(BLT|BHL)-?)?([0-9A-F]{10})$", re.IGNORECASE)
# billets achetés en ligne (BLT-…) et billets hors ligne générés par l'organisateur (BHL-…)
PREFIXES_BILLET = ("BLT-", "BHL-")
LIBELLES_LOT = {"depot": "Dépôt-vente", "guichet": "Vente au guichet", "invitation": "Invitation"}


def numero_depuis_code(code: str) -> Optional[str]:
    """QR code (numéro chiffré) ou numéro tapé à la main -> « BLT-XXXXXXXXXX » ou « BHL-XXXXXXXXXX »."""
    brut = (code or "").strip()
    saisi = MOTIF_NUMERO.match(brut.replace(" ", ""))
    if saisi:
        return f"{(saisi.group(1) or 'BLT').upper()}-{saisi.group(2).upper()}"
    try:
        clair = decrypt_data(brut).strip()
    except Exception:
        return None
    return clair if clair.startswith(PREFIXES_BILLET) else None


def porteur_hors_ligne(lot: LotHorsLigne) -> str:
    if lot.type == "depot" and lot.revendeur_nom:
        return f"Billet vendu par {lot.revendeur_nom}"
    return LIBELLES_LOT.get(lot.type, "Billet hors ligne")


def peut_controler(auth_data: dict, evenement: Evenement) -> bool:
    # administrateur ou organisateur de l'événement
    return est_admin(auth_data) or auth_data.get("user_id") == evenement.organisateur_id


class ControleEntreeService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def compteurs(self, evenement_id: int) -> tuple[int, int]:
        """Billets valables (en ligne + hors ligne non annulés) et billets déjà passés à l'entrée."""
        row = (
            await self.db.execute(
                select(func.count(Billet.id), func.coalesce(func.sum(case((Billet.is_used.is_(True), 1), else_=0)), 0))
                .join(Reservation, Billet.reservation_id == Reservation.id)
                .where(Reservation.evenement_id == evenement_id)
            )
        ).one()
        hors_ligne = (
            await self.db.execute(
                select(
                    func.count(BilletHorsLigne.id),
                    func.coalesce(func.sum(case((BilletHorsLigne.is_used.is_(True), 1), else_=0)), 0),
                )
                .join(LotHorsLigne, BilletHorsLigne.lot_id == LotHorsLigne.id)
                .where(LotHorsLigne.evenement_id == evenement_id, BilletHorsLigne.annule.is_(False))
            )
        ).one()
        return int(row[0] or 0) + int(hors_ligne[0] or 0), int(row[1] or 0) + int(hors_ligne[1] or 0)

    async def evenements(self, auth_data: dict) -> List[dict]:
        requete = (
            select(Evenement, Lieu)
            .outerjoin(Lieu, Evenement.lieu_id == Lieu.id)
            .where(Evenement.statut_validation == "valide")
        )
        if not est_admin(auth_data):
            requete = requete.where(Evenement.organisateur_id == auth_data.get("user_id"))
        lignes = (await self.db.execute(requete)).all()
        maintenant = datetime.now(timezone.utc)
        resultat = []
        for e, l in lignes:
            vendus, entres = await self.compteurs(e.id)
            resultat.append(
                {
                    "id": e.id,
                    "titre": e.titre,
                    "date_debut": e.date_debut,
                    "lieu": ", ".join(x for x in [l.nom, l.ville] if x) if l else None,
                    "billets_vendus": vendus,
                    "entres": entres,
                }
            )
        # d'abord les événements du jour et à venir (du plus proche), puis les passés (du plus récent)
        limite = maintenant - timedelta(hours=12)
        a_venir = sorted([r for r in resultat if r["date_debut"] >= limite], key=lambda r: r["date_debut"])
        passes = sorted([r for r in resultat if r["date_debut"] < limite], key=lambda r: r["date_debut"], reverse=True)
        return a_venir + passes

    async def _billet_scanne(self, billet_id: int) -> Optional[dict]:
        row = (
            await self.db.execute(
                select(Billet, CategorieBillet, Participant, Evenement)
                .join(Reservation, Billet.reservation_id == Reservation.id)
                .join(CategorieBillet, Reservation.categorie_billet_id == CategorieBillet.id)
                .join(Participant, Reservation.participant_id == Participant.id)
                .join(Evenement, Reservation.evenement_id == Evenement.id)
                .where(Billet.id == billet_id)
            )
        ).first()
        if not row:
            return None
        b, c, p, e = row
        return {
            "numero": b.numero_billet,
            "categorie": c.nom,
            "participant": f"{p.prenom} {p.nom}".strip(),
            "date_scan": b.date_scan,
            "evenement_id": e.id,
            "evenement_titre": e.titre,
        }

    async def etat(self, evenement: Evenement) -> dict:
        vendus, entres = await self.compteurs(evenement.id)
        tarifs = (
            await self.db.execute(
                select(
                    CategorieBillet.nom,
                    func.count(Billet.id),
                    func.coalesce(func.sum(case((Billet.is_used.is_(True), 1), else_=0)), 0),
                )
                .select_from(CategorieBillet)
                .outerjoin(Reservation, Reservation.categorie_billet_id == CategorieBillet.id)
                .outerjoin(Billet, Billet.reservation_id == Reservation.id)
                .where(CategorieBillet.evenement_id == evenement.id)
                .group_by(CategorieBillet.id, CategorieBillet.nom)
                .order_by(CategorieBillet.prix, CategorieBillet.id)
            )
        ).all()
        derniers = (
            await self.db.execute(
                select(Billet.numero_billet, CategorieBillet.nom, Participant.prenom, Participant.nom, Billet.date_scan)
                .join(Reservation, Billet.reservation_id == Reservation.id)
                .join(CategorieBillet, Reservation.categorie_billet_id == CategorieBillet.id)
                .join(Participant, Reservation.participant_id == Participant.id)
                .where(Reservation.evenement_id == evenement.id, Billet.is_used.is_(True))
                .order_by(Billet.date_scan.desc().nullslast(), Billet.id.desc())
                .limit(8)
            )
        ).all()
        # billets hors ligne : ajoutés à leur tarif et aux derniers passages
        tarifs_hl = {
            nom: (int(v or 0), int(u or 0))
            for nom, v, u in (
                await self.db.execute(
                    select(
                        CategorieBillet.nom,
                        func.count(BilletHorsLigne.id),
                        func.coalesce(func.sum(case((BilletHorsLigne.is_used.is_(True), 1), else_=0)), 0),
                    )
                    .join(LotHorsLigne, LotHorsLigne.categorie_billet_id == CategorieBillet.id)
                    .join(BilletHorsLigne, BilletHorsLigne.lot_id == LotHorsLigne.id)
                    .where(LotHorsLigne.evenement_id == evenement.id, BilletHorsLigne.annule.is_(False))
                    .group_by(CategorieBillet.nom)
                )
            ).all()
        }
        tarifs = [(n, int(v or 0) + tarifs_hl.get(n, (0, 0))[0], int(u or 0) + tarifs_hl.get(n, (0, 0))[1]) for n, v, u in tarifs]
        passages = [
            {"numero": num, "categorie": cat, "participant": f"{pr} {no}".strip(), "date_scan": d} for num, cat, pr, no, d in derniers
        ]
        derniers_hl = (
            await self.db.execute(
                select(BilletHorsLigne, LotHorsLigne, CategorieBillet.nom)
                .join(LotHorsLigne, BilletHorsLigne.lot_id == LotHorsLigne.id)
                .join(CategorieBillet, LotHorsLigne.categorie_billet_id == CategorieBillet.id)
                .where(LotHorsLigne.evenement_id == evenement.id, BilletHorsLigne.is_used.is_(True))
                .order_by(BilletHorsLigne.date_scan.desc().nullslast(), BilletHorsLigne.id.desc())
                .limit(8)
            )
        ).all()
        passages += [
            {"numero": b.numero_billet, "categorie": cat, "participant": porteur_hors_ligne(lot), "date_scan": b.date_scan}
            for b, lot, cat in derniers_hl
        ]
        plus_ancien = datetime.min.replace(tzinfo=timezone.utc)
        passages = sorted(passages, key=lambda p: p["date_scan"] or plus_ancien, reverse=True)[:8]
        lieu = await self.db.get(Lieu, evenement.lieu_id) if evenement.lieu_id else None
        return {
            "id": evenement.id,
            "titre": evenement.titre,
            "date_debut": evenement.date_debut,
            "lieu": ", ".join(x for x in [lieu.nom, lieu.ville] if x) if lieu else None,
            "billets_vendus": vendus,
            "entres": entres,
            "par_tarif": [{"nom": n, "vendus": int(v or 0), "entres": int(u or 0)} for n, v, u in tarifs],
            "derniers": passages,
        }

    async def _scanner_hors_ligne(self, evenement: Evenement, numero: Optional[str], code: str) -> Optional[dict]:
        """Billet généré par l'organisateur (BHL-…) : None si le code n'en est pas un."""
        requete = select(BilletHorsLigne, LotHorsLigne, CategorieBillet, Evenement).join(
            LotHorsLigne, BilletHorsLigne.lot_id == LotHorsLigne.id
        ).join(CategorieBillet, LotHorsLigne.categorie_billet_id == CategorieBillet.id).join(
            Evenement, LotHorsLigne.evenement_id == Evenement.id
        )
        row = None
        if numero and numero.startswith("BHL-"):
            row = (await self.db.execute(requete.where(BilletHorsLigne.numero_billet == numero))).first()
        if row is None:
            row = (await self.db.execute(requete.where(BilletHorsLigne.qr_code == code.strip()))).first()
        if row is None:
            return None
        b, lot, c, e = row

        def infos() -> dict:
            return {"numero": b.numero_billet, "categorie": c.nom, "participant": porteur_hors_ligne(lot), "date_scan": b.date_scan}

        def reponse(statut: str, message: str, autre: Optional[str] = None):
            return {"statut": statut, "message": message, "billet": infos(), "evenement_billet": autre}

        if e.id != evenement.id:
            return reponse("autre_evenement", f"Ce billet est pour « {e.titre} ».", e.titre)
        if b.annule:
            return reponse("annule", "Billet annulé : il a été rendu invendu par le revendeur.")
        passe = (
            await self.db.execute(
                update(BilletHorsLigne)
                .where(BilletHorsLigne.id == b.id, BilletHorsLigne.is_used.is_(False), BilletHorsLigne.annule.is_(False))
                .values(is_used=True, date_scan=func.now())
                .returning(BilletHorsLigne.id)
            )
        ).scalar()
        await self.db.commit()
        await self.db.refresh(b)
        if passe:
            return reponse("valide", "Billet valide : bonne soirée !")
        return reponse("deja_utilise", "Billet déjà utilisé : ce QR code a déjà été scanné.")

    async def scanner(self, evenement: Evenement, code: str) -> dict:
        numero = numero_depuis_code(code)
        hors_ligne = None if numero and numero.startswith("BLT-") else await self._scanner_hors_ligne(evenement, numero, code)
        if hors_ligne is not None:
            vendus, entres = await self.compteurs(evenement.id)
            return {**hors_ligne, "billets_vendus": vendus, "entres": entres}
        billet_id = None
        if numero:
            billet_id = (await self.db.execute(select(Billet.id).where(Billet.numero_billet == numero))).scalar()
        if billet_id is None:
            # QR code enregistré tel quel (au cas où le chiffrement aurait changé de forme)
            billet_id = (await self.db.execute(select(Billet.id).where(Billet.qr_code == code.strip()))).scalar()

        def reponse(statut: str, message: str, billet: Optional[dict] = None, autre: Optional[str] = None):
            return {"statut": statut, "message": message, "billet": billet, "evenement_billet": autre}

        if billet_id is None:
            resultat = reponse("inconnu", "Billet inconnu : ce code ne correspond à aucun billet guichetweb.")
        else:
            infos = await self._billet_scanne(billet_id)
            if infos["evenement_id"] != evenement.id:
                resultat = reponse("autre_evenement", f"Ce billet est pour « {infos['evenement_titre']} ».", infos, infos["evenement_titre"])
            else:
                # une seule requête : deux scans simultanés du même billet ne peuvent pas passer tous les deux
                passe = (
                    await self.db.execute(
                        update(Billet)
                        .where(Billet.id == billet_id, Billet.is_used.is_(False))
                        .values(is_used=True, date_scan=func.now())
                        .returning(Billet.id)
                    )
                ).scalar()
                await self.db.commit()
                infos = await self._billet_scanne(billet_id)
                if passe:
                    resultat = reponse("valide", "Billet valide : bonne soirée !", infos)
                else:
                    resultat = reponse("deja_utilise", "Billet déjà utilisé : ce QR code a déjà été scanné.", infos)

        vendus, entres = await self.compteurs(evenement.id)
        return {**resultat, "billets_vendus": vendus, "entres": entres}
