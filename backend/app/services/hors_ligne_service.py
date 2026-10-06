"""Billets hors ligne : génération par lots (dépôt-vente, guichet, invitations), facturation
de la plateforme, suivi du dépôt-vente et règlement. Voir app/models/billet_hors_ligne.py."""
import math
import os
import uuid
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.roles import est_admin
from app.models.billet_hors_ligne import TYPES_LOT, BilletHorsLigne, LotHorsLigne
from app.models.categorie import Categorie
from app.models.categorie_billet import CategorieBillet
from app.models.evenement import Evenement
from app.models.lieu import Lieu
from app.models.user import User
from app.services.billetterie_service import BilletterieService, ErreurBilletterie, verifier_telephone
from app.utils.billet_pdf import InfosBillet, generer_pdf_billets, generer_planche_billets
from app.utils.crypto import encrypt_data

# frais fixe facturé par la plateforme pour chaque billet généré (en ariary)
FRAIS_PAR_BILLET = float(os.getenv("FRAIS_BILLET_HORS_LIGNE", "500"))
# dépôt-vente : le revendeur règle une fois 80 % du lot vendu
SEUIL_REGLEMENT = 0.8
QUANTITE_MAX_LOT = 500

LIBELLES_TYPE = {"depot": "Dépôt-vente", "guichet": "Vente au guichet", "invitation": "Invitation"}


class ErreurHorsLigne(ValueError):
    pass


def maintenant() -> datetime:
    return datetime.now(timezone.utc)


def seuil_billets(quantite: int) -> int:
    """Nombre de billets vendus à partir duquel le dépôt peut être réglé (80 %, arrondi au-dessus)."""
    return math.ceil(quantite * SEUIL_REGLEMENT)


def nouveau_numero() -> str:
    return f"BHL-{uuid.uuid4().hex[:10].upper()}"


class HorsLigneService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ---------- génération ----------

    async def generer(self, auth_data: dict, saisie) -> LotHorsLigne:
        if saisie.type not in TYPES_LOT:
            raise ErreurHorsLigne("Type de lot inconnu.")
        if saisie.type == "depot" and not (saisie.revendeur_nom or "").strip():
            raise ErreurHorsLigne("Indiquez le nom de l'entreprise partenaire qui vendra les billets.")
        if not 1 <= saisie.quantite <= QUANTITE_MAX_LOT:
            raise ErreurHorsLigne(f"Un lot compte de 1 à {QUANTITE_MAX_LOT} billets.")

        evenement = await self.db.get(Evenement, saisie.evenement_id)
        if not evenement:
            raise ErreurHorsLigne("Événement introuvable.")
        if not est_admin(auth_data) and evenement.organisateur_id != auth_data.get("user_id"):
            raise ErreurHorsLigne("Vous ne pouvez générer des billets que pour vos événements.")
        if evenement.statut_validation != "valide":
            raise ErreurHorsLigne("L'événement doit être validé par l'administrateur avant de générer des billets.")
        if evenement.date_debut and evenement.date_debut < maintenant():
            raise ErreurHorsLigne("Cet événement est déjà passé.")
        categorie = await self.db.get(CategorieBillet, saisie.categorie_billet_id)
        if not categorie or categorie.evenement_id != evenement.id:
            raise ErreurHorsLigne("Ce tarif n'existe pas pour cet événement.")
        if categorie.quantite_disponible is not None:
            restantes = categorie.quantite_disponible - await BilletterieService(self.db).places_prises(categorie.id)
            if saisie.quantite > restantes:
                raise ErreurHorsLigne(f"Il ne reste que {max(restantes, 0)} places « {categorie.nom} ».")

        # paiement des frais de la plateforme (Mobile Money simulé)
        try:
            verifier_telephone(saisie.mode_paiement, saisie.telephone)
        except ErreurBilletterie as e:
            raise ErreurHorsLigne(str(e))

        lot = LotHorsLigne(
            type=saisie.type,
            evenement_id=evenement.id,
            categorie_billet_id=categorie.id,
            organisateur_id=evenement.organisateur_id,
            revendeur_nom=(saisie.revendeur_nom or "").strip() or None,
            revendeur_contact=(saisie.revendeur_contact or "").strip() or None,
            quantite=saisie.quantite,
            prix_unitaire=0.0 if saisie.type == "invitation" else float(categorie.prix),
            frais_unitaire=FRAIS_PAR_BILLET,
            montant_frais=FRAIS_PAR_BILLET * saisie.quantite,
            mode_paiement_frais=saisie.mode_paiement,
            reference_paiement=f"SIM-{uuid.uuid4().hex[:8].upper()}",
        )
        for _ in range(saisie.quantite):
            numero = nouveau_numero()
            lot.billets.append(BilletHorsLigne(numero_billet=numero, qr_code=encrypt_data(numero)))
        self.db.add(lot)
        await self.db.commit()
        await self.db.refresh(lot)
        return lot

    # ---------- consultation ----------

    async def evenements_disponibles(self, auth_data: dict) -> List[dict]:
        """Événements validés et à venir de l'organisateur, avec leurs tarifs et places restantes."""
        requete = select(Evenement).where(Evenement.statut_validation == "valide", Evenement.date_debut > maintenant())
        if not est_admin(auth_data):
            requete = requete.where(Evenement.organisateur_id == auth_data.get("user_id"))
        evenements = (await self.db.execute(requete.order_by(Evenement.date_debut))).scalars().all()
        billetterie = BilletterieService(self.db)
        fonds_tarifs = dict(
            (await self.db.execute(
                select(CategorieBillet.id, CategorieBillet.fond_url).where(CategorieBillet.evenement_id.in_([e.id for e in evenements] or [0]))
            )).all()
        )
        fonds_types = await self._fonds_types([e.categorie_id for e in evenements])
        resultat = []
        for e in evenements:
            tarifs = [{**t, "fond_url": fonds_tarifs.get(t["id"])} for t in await billetterie.tarifs(e.id)]
            resultat.append({"id": e.id, "titre": e.titre, "date_debut": e.date_debut, "tarifs": tarifs, "fond_type": fonds_types.get(e.categorie_id)})
        return resultat

    async def _fonds_types(self, categorie_ids: List[Optional[int]]) -> dict:
        ids = [i for i in set(categorie_ids) if i]
        if not ids:
            return {}
        return dict((await self.db.execute(select(Categorie.id, Categorie.fond_url).where(Categorie.id.in_(ids)))).all())

    async def lot_autorise(self, auth_data: dict, lot_id: int) -> LotHorsLigne:
        lot = await self.db.get(LotHorsLigne, lot_id)
        if not lot:
            raise ErreurHorsLigne("Lot introuvable.")
        if not est_admin(auth_data) and lot.organisateur_id != auth_data.get("user_id"):
            raise ErreurHorsLigne("Ce lot ne vous appartient pas.")
        return lot

    async def _compteurs(self, lot_ids: List[int]) -> dict:
        if not lot_ids:
            return {}
        lignes = (
            await self.db.execute(
                select(
                    BilletHorsLigne.lot_id,
                    func.coalesce(func.sum(case((BilletHorsLigne.is_used.is_(True), 1), else_=0)), 0),
                    func.coalesce(func.sum(case((BilletHorsLigne.annule.is_(True), 1), else_=0)), 0),
                )
                .where(BilletHorsLigne.lot_id.in_(lot_ids))
                .group_by(BilletHorsLigne.lot_id)
            )
        ).all()
        return {lot_id: (int(u), int(a)) for lot_id, u, a in lignes}

    def _resume(
        self, lot: LotHorsLigne, e: Evenement, c: CategorieBillet, utilises: int, annules: int, fond_type: Optional[str] = None
    ) -> dict:
        # un billet de dépôt scanné à l'entrée a forcément été vendu
        vendus = (lot.quantite - annules) if lot.statut == "regle" else max(lot.vendus_declares or 0, utilises)
        seuil = seuil_billets(lot.quantite)
        return {
            "id": lot.id,
            "type": lot.type,
            "type_libelle": LIBELLES_TYPE[lot.type],
            "evenement_id": e.id,
            "evenement_titre": e.titre,
            "evenement_date": e.date_debut,
            "categorie_nom": c.nom,
            "revendeur_nom": lot.revendeur_nom,
            "revendeur_contact": lot.revendeur_contact,
            "quantite": lot.quantite,
            "prix_unitaire": lot.prix_unitaire,
            "frais_unitaire": lot.frais_unitaire,
            "montant_frais": lot.montant_frais,
            "mode_paiement_frais": lot.mode_paiement_frais,
            "reference_paiement": lot.reference_paiement,
            "date_creation": lot.date_creation,
            "statut": lot.statut,
            "vendus_declares": lot.vendus_declares or 0,
            "vendus": vendus,
            "utilises": utilises,
            "annules": annules,
            "seuil": seuil,
            "seuil_atteint": vendus >= seuil,
            "montant_attendu": vendus * lot.prix_unitaire,
            "date_reglement": lot.date_reglement,
            "montant_regle": lot.montant_regle,
            # fond imprimé sur les billets : celui du tarif, sinon celui du type d'événement
            "fond_url": c.fond_url or fond_type,
            "fond_source": "tarif" if c.fond_url else ("type" if fond_type else None),
        }

    async def lots(self, auth_data: dict) -> dict:
        requete = (
            select(LotHorsLigne, Evenement, CategorieBillet)
            .join(Evenement, LotHorsLigne.evenement_id == Evenement.id)
            .join(CategorieBillet, LotHorsLigne.categorie_billet_id == CategorieBillet.id)
            .order_by(LotHorsLigne.date_creation.desc(), LotHorsLigne.id.desc())
        )
        if not est_admin(auth_data):
            requete = requete.where(LotHorsLigne.organisateur_id == auth_data.get("user_id"))
        lignes = (await self.db.execute(requete)).all()
        compteurs = await self._compteurs([lot.id for lot, _, _ in lignes])
        fonds = await self._fonds_types([e.categorie_id for _, e, _ in lignes])
        lots = [self._resume(lot, e, c, *compteurs.get(lot.id, (0, 0)), fonds.get(e.categorie_id)) for lot, e, c in lignes]
        return {
            "frais_unitaire": FRAIS_PAR_BILLET,
            "seuil_pourcentage": int(SEUIL_REGLEMENT * 100),
            "billets_generes": sum(l["quantite"] for l in lots),
            "frais_payes": sum(l["montant_frais"] for l in lots),
            "lots": lots,
        }

    async def detail(self, auth_data: dict, lot_id: int) -> dict:
        lot = await self.lot_autorise(auth_data, lot_id)
        e = await self.db.get(Evenement, lot.evenement_id)
        c = await self.db.get(CategorieBillet, lot.categorie_billet_id)
        billets = (
            await self.db.execute(select(BilletHorsLigne).where(BilletHorsLigne.lot_id == lot.id).order_by(BilletHorsLigne.id))
        ).scalars().all()
        utilises = sum(1 for b in billets if b.is_used)
        annules = sum(1 for b in billets if b.annule)
        fond_type = (await self._fonds_types([e.categorie_id])).get(e.categorie_id)
        return {
            **self._resume(lot, e, c, utilises, annules, fond_type),
            "billets": [
                {"numero": b.numero_billet, "utilise": b.is_used, "date_scan": b.date_scan, "annule": b.annule} for b in billets
            ],
        }

    async def pdf(
        self, auth_data: dict, lot_id: int, format: str = "planche", de: Optional[int] = None, a: Optional[int] = None
    ) -> tuple[bytes, str]:
        """Billets du lot à imprimer. format : « planche » (18 par page A4, à découper) ou « a5 » (un par page).
        de / a : positions dans le lot (1 = premier billet), pour imprimer une partie ou réimprimer un billet ;
        le QR code reste le même. Les billets annulés ne sont jamais imprimés."""
        lot = await self.lot_autorise(auth_data, lot_id)
        e = await self.db.get(Evenement, lot.evenement_id)
        c = await self.db.get(CategorieBillet, lot.categorie_billet_id)
        lieu = await self.db.get(Lieu, e.lieu_id) if e.lieu_id else None
        type_evenement = await self.db.get(Categorie, e.categorie_id) if e.categorie_id else None
        fond = c.fond_url or (type_evenement.fond_url if type_evenement else None)
        tous = (
            await self.db.execute(select(BilletHorsLigne).where(BilletHorsLigne.lot_id == lot.id).order_by(BilletHorsLigne.id))
        ).scalars().all()
        debut, fin = de or 1, a or len(tous)
        if not 1 <= debut <= fin <= len(tous):
            raise ErreurHorsLigne(f"Choisissez une plage entre 1 et {len(tous)}.")
        billets = [b for b in tous[debut - 1 : fin] if not b.annule]
        if not billets:
            raise ErreurHorsLigne("Aucun billet à imprimer : ceux de cette plage ont été annulés.")
        porteur = {
            "depot": f"Vendu par {lot.revendeur_nom}",
            "guichet": "Vente au guichet",
            "invitation": "Invitation",
        }[lot.type]
        infos = [
            InfosBillet(
                numero=b.numero_billet,
                qr=b.qr_code,
                evenement=e.titre,
                date_debut=e.date_debut,
                lieu=", ".join(x for x in [lieu.nom, lieu.ville] if x) if lieu else None,
                categorie=c.nom if lot.type != "invitation" else f"{c.nom} (invitation)",
                prix=lot.prix_unitaire,
                participant=porteur,
                utilise=b.is_used,
                fond=fond,
            )
            for b in billets
        ]
        suffixe = "" if (debut, fin) == (1, len(tous)) else f"-{debut}-a-{fin}"
        if format == "a5":
            return generer_pdf_billets(infos), f"lot-{lot.id}-{lot.type}{suffixe}-a5.pdf"
        pied = f"lot n° {lot.id} - {e.titre} - {c.nom}"
        return generer_planche_billets(infos, pied), f"lot-{lot.id}-{lot.type}{suffixe}-planche.pdf"

    # ---------- suivi du dépôt et règlement ----------

    async def declarer_vendus(self, auth_data: dict, lot_id: int, vendus: int) -> dict:
        lot = await self.lot_autorise(auth_data, lot_id)
        if lot.type == "invitation":
            raise ErreurHorsLigne("Les invitations ne se vendent pas.")
        if lot.statut == "regle":
            raise ErreurHorsLigne("Ce lot est déjà réglé.")
        utilises, _ = (await self._compteurs([lot.id])).get(lot.id, (0, 0))
        if not 0 <= vendus <= lot.quantite:
            raise ErreurHorsLigne(f"Le nombre de billets vendus va de 0 à {lot.quantite}.")
        if vendus < utilises:
            raise ErreurHorsLigne(f"{utilises} billets de ce lot sont déjà passés à l'entrée : ils sont forcément vendus.")
        lot.vendus_declares = vendus
        await self.db.commit()
        return await self.detail(auth_data, lot_id)

    async def regler(self, auth_data: dict, lot_id: int, numeros_invendus: List[str], forcer: bool) -> dict:
        lot = await self.lot_autorise(auth_data, lot_id)
        if lot.statut == "regle":
            raise ErreurHorsLigne("Ce lot est déjà réglé.")
        numeros = {n.strip().upper() for n in numeros_invendus if n and n.strip()}
        billets = (
            await self.db.execute(select(BilletHorsLigne).where(BilletHorsLigne.lot_id == lot.id))
        ).scalars().all()
        par_numero = {b.numero_billet: b for b in billets}
        inconnus = sorted(numeros - par_numero.keys())
        if inconnus:
            raise ErreurHorsLigne(f"Ces billets ne font pas partie du lot : {', '.join(inconnus[:5])}.")
        utilises = sorted(n for n in numeros if par_numero[n].is_used)
        if utilises:
            raise ErreurHorsLigne(f"Ces billets sont déjà passés à l'entrée, ils ne peuvent pas être rendus : {', '.join(utilises[:5])}.")

        vendus = lot.quantite - len(numeros)
        if lot.type == "depot" and vendus < seuil_billets(lot.quantite) and not forcer:
            raise ErreurHorsLigne(
                f"SEUIL_NON_ATTEINT: {vendus} billets vendus sur {lot.quantite}, le seuil de "
                f"{int(SEUIL_REGLEMENT * 100)} % ({seuil_billets(lot.quantite)} billets) n'est pas atteint."
            )
        moment = maintenant()
        for n in numeros:
            par_numero[n].annule = True
            par_numero[n].date_annulation = moment
        lot.vendus_declares = vendus
        lot.statut = "regle"
        lot.date_reglement = moment
        lot.montant_regle = vendus * lot.prix_unitaire
        await self.db.commit()
        return await self.detail(auth_data, lot_id)

    # ---------- facturation (administrateur) ----------

    async def facturation(self) -> dict:
        lignes = (
            await self.db.execute(
                select(
                    User.id,
                    User.fullname,
                    User.email,
                    func.count(LotHorsLigne.id),
                    func.coalesce(func.sum(LotHorsLigne.quantite), 0),
                    func.coalesce(func.sum(LotHorsLigne.montant_frais), 0.0),
                    func.max(LotHorsLigne.date_creation),
                )
                .join(LotHorsLigne, LotHorsLigne.organisateur_id == User.id)
                .group_by(User.id, User.fullname, User.email)
                .order_by(func.sum(LotHorsLigne.montant_frais).desc())
            )
        ).all()
        par_type = (
            await self.db.execute(
                select(LotHorsLigne.type, func.coalesce(func.sum(LotHorsLigne.quantite), 0)).group_by(LotHorsLigne.type)
            )
        ).all()
        organisateurs = [
            {
                "organisateur_id": uid,
                "nom": nom,
                "email": email,
                "lots": int(nb),
                "billets_generes": int(billets),
                "frais_payes": float(frais),
                "dernier_lot": dernier,
            }
            for uid, nom, email, nb, billets, frais, dernier in lignes
        ]
        recents = (await self.lots({"role": "admin"}))["lots"][:15]
        return {
            "frais_unitaire": FRAIS_PAR_BILLET,
            "billets_generes": sum(o["billets_generes"] for o in organisateurs),
            "frais_payes": sum(o["frais_payes"] for o in organisateurs),
            "par_type": {t: int(n) for t, n in par_type},
            "organisateurs": organisateurs,
            "lots_recents": recents,
        }
