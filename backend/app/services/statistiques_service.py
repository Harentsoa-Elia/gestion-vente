"""Statistiques de l'organisateur : ventes, entrées, remplissage, public (genre, âge), popularité.

Périmètre : un événement, ou tous les événements de l'organisateur (tous pour l'administrateur).
Les ventes sont regroupées par jour à l'heure de Madagascar.

Les billets hors ligne (dépôt-vente, guichet, invitations) sont comptés avec les billets en ligne :
- vendus : billets réglés, sinon ventes déclarées (au moins les billets déjà scannés) ; une invitation n'est pas vendue ;
- places occupées et non scannés : tous les billets hors ligne valables (non annulés), invitations comprises ;
- la courbe des ventes par jour ne contient que les ventes en ligne (une vente hors ligne n'a pas de date).
"""
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy import case, distinct, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.billet import Billet
from app.models.billet_hors_ligne import BilletHorsLigne, LotHorsLigne
from app.models.categorie_billet import CategorieBillet
from app.models.evenement import Evenement
from app.models.interaction_publique import InteractionPublique
from app.models.paiement import Paiement
from app.models.participant import Participant
from app.models.proposition import Proposition
from app.models.reservation import Reservation
from app.services.billetterie_service import DUREE_RESERVATION
from app.utils.fuseau import FUSEAU_MADAGASCAR
from app.utils.scoring import POIDS_INTERACTION
from app.auth.roles import est_admin

TRANCHES = [(0, 17, "Moins de 18 ans"), (18, 24, "18-24 ans"), (25, 34, "25-34 ans"), (35, 44, "35-44 ans"), (45, 200, "45 ans et plus")]
MAX_JOURS = 90  # au-delà, la courbe des ventes ne garde que les 90 derniers jours


def genre_normalise(genre: Optional[str]) -> str:
    g = (genre or "").strip().lower()
    if g.startswith(("f", "femme")):
        return "Femmes"
    if g.startswith(("m", "h")):
        return "Hommes"
    if g:
        return "Autre"
    return "Non précisé"


def age(naissance: date, aujourd_hui: date) -> int:
    return aujourd_hui.year - naissance.year - ((aujourd_hui.month, aujourd_hui.day) < (naissance.month, naissance.day))


class StatistiquesService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def evenements_du_perimetre(self, auth_data: dict) -> List[Evenement]:
        # événements publiés (validés), plus ceux qui ont déjà des ventes
        requete = (
            select(Evenement)
            .where(or_(Evenement.statut_validation == "valide", Evenement.id.in_(select(Reservation.evenement_id))))
            .order_by(Evenement.date_debut.desc())
        )
        if not est_admin(auth_data):
            requete = requete.where(Evenement.organisateur_id == auth_data.get("user_id"))
        return list((await self.db.execute(requete)).scalars().all())

    async def _capacites(self, ids: List[int]) -> Dict[int, Optional[int]]:
        """Capacité de l'événement, sinon somme des quotas de ses tarifs (si tous sont limités)."""
        rows = (
            await self.db.execute(
                select(
                    CategorieBillet.evenement_id,
                    func.sum(CategorieBillet.quantite_disponible),
                    func.count(CategorieBillet.id),
                    func.count(CategorieBillet.quantite_disponible),
                )
                .where(CategorieBillet.evenement_id.in_(ids))
                .group_by(CategorieBillet.evenement_id)
            )
        ).all()
        return {ev: int(total) for ev, total, n, n_limites in rows if n and n == n_limites and total}

    async def calculer(self, auth_data: dict, evenement_id: Optional[int]) -> Dict:
        tous = await self.evenements_du_perimetre(auth_data)
        cibles = [e for e in tous if evenement_id is None or e.id == evenement_id]
        ids = [e.id for e in cibles] or [-1]
        aujourd_hui = datetime.now(FUSEAU_MADAGASCAR).date()

        # --- par événement : vendus, entrés, recettes
        par_ev = {
            ev: (int(v or 0), int(u or 0))
            for ev, v, u in (
                await self.db.execute(
                    select(Reservation.evenement_id, func.count(Billet.id), func.sum(case((Billet.is_used.is_(True), 1), else_=0)))
                    .join(Billet, Billet.reservation_id == Reservation.id)
                    .where(Reservation.evenement_id.in_(ids))
                    .group_by(Reservation.evenement_id)
                )
            ).all()
        }
        recettes_ev = {
            ev: float(m or 0)
            for ev, m in (
                await self.db.execute(
                    select(Reservation.evenement_id, func.sum(Paiement.montant))
                    .join(Paiement, Paiement.reservation_id == Reservation.id)
                    .where(Reservation.evenement_id.in_(ids), Paiement.statut_paiement == "paye")
                    .group_by(Reservation.evenement_id)
                )
            ).all()
        }
        quotas = await self._capacites(ids)
        hors_ligne = await self._hors_ligne(ids)
        hl_ev = hors_ligne.pop("_par_evenement")
        hl_tarifs = hors_ligne.pop("_par_tarif")

        # --- popularité : points des réactions aux propositions (mêmes poids que les recommandations)
        scores: Dict[int, int] = {}
        for ev, type_, n in (
            await self.db.execute(
                select(Proposition.evenement_id, InteractionPublique.type_interaction, func.count(InteractionPublique.id))
                .join(InteractionPublique, InteractionPublique.proposition_id == Proposition.id)
                .where(Proposition.evenement_id.in_(ids))
                .group_by(Proposition.evenement_id, InteractionPublique.type_interaction)
            )
        ).all():
            scores[ev] = scores.get(ev, 0) + POIDS_INTERACTION.get(type_, 0) * int(n)

        evenements = []
        occupees_ev: Dict[int, int] = {}
        for e in cibles:
            vendus, entres = par_ev.get(e.id, (0, 0))
            hl = hl_ev.get(e.id, {"vendus": 0, "valables": 0, "entres": 0, "recettes": 0.0})
            # places occupées : billets en ligne + billets hors ligne valables (invitations et dépôts non réglés compris)
            occupees_ev[e.id] = vendus + hl["valables"]
            capacite = e.capacite or quotas.get(e.id)
            evenements.append(
                {
                    "id": e.id,
                    "titre": e.titre,
                    "date_debut": e.date_debut,
                    "capacite": capacite,
                    "vendus": vendus + hl["vendus"],
                    "entres": entres + hl["entres"],
                    "recettes": recettes_ev.get(e.id, 0.0) + hl["recettes"],
                    "taux_remplissage": round(min(occupees_ev[e.id] / capacite * 100, 100), 1) if capacite else None,
                    "score_popularite": scores.get(e.id, 0),
                }
            )

        vendus = sum(x["vendus"] for x in evenements)
        entres = sum(x["entres"] for x in evenements)
        occupees = sum(occupees_ev.values())
        # remplissage calculé sur les événements dont la capacité est connue
        capacite = sum(x["capacite"] for x in evenements if x["capacite"]) or None
        occupees_avec_capacite = sum(occupees_ev[x["id"]] for x in evenements if x["capacite"])

        en_attente = (
            await self.db.execute(
                select(func.count(Reservation.id)).where(
                    Reservation.evenement_id.in_(ids),
                    Reservation.statut == "en_attente",
                    Reservation.date_reservation >= datetime.now(timezone.utc) - DUREE_RESERVATION,
                )
            )
        ).scalar() or 0

        # --- ventes par jour (heure de Madagascar)
        jour = func.date(func.timezone("Indian/Antananarivo", Paiement.date_paiement))
        ventes = (
            await self.db.execute(
                select(jour, func.count(Paiement.id), func.sum(Paiement.montant))
                .join(Reservation, Paiement.reservation_id == Reservation.id)
                .where(Reservation.evenement_id.in_(ids), Paiement.statut_paiement == "paye", Paiement.date_paiement.isnot(None))
                .group_by(jour)
                .order_by(jour)
            )
        ).all()
        ventes_par_jour = []
        if ventes:
            par_date = {d: (int(n), float(m or 0)) for d, n, m in ventes}
            debut = max(ventes[0][0], ventes[-1][0] - timedelta(days=MAX_JOURS - 1))
            fin = max(ventes[-1][0], min(aujourd_hui, ventes[-1][0] + timedelta(days=MAX_JOURS)))
            d = debut
            while d <= fin and len(ventes_par_jour) < MAX_JOURS:
                n, m = par_date.get(d, (0, 0.0))
                ventes_par_jour.append({"date": d, "billets": n, "montant": m})
                d += timedelta(days=1)
            ventes_par_jour = ventes_par_jour[-MAX_JOURS:]

        # --- par tarif
        par_tarif_en_ligne = [
            (nom, int(n or 0), float(m or 0))
            for nom, n, m in (
                await self.db.execute(
                    select(CategorieBillet.nom, func.count(Billet.id), func.sum(Paiement.montant))
                    .join(Reservation, Reservation.categorie_billet_id == CategorieBillet.id)
                    .join(Billet, Billet.reservation_id == Reservation.id)
                    .outerjoin(Paiement, Paiement.reservation_id == Reservation.id)
                    .where(CategorieBillet.evenement_id.in_(ids))
                    .group_by(CategorieBillet.nom)
                    .order_by(func.count(Billet.id).desc())
                )
            ).all()
        ]
        cumul: Dict[str, List[float]] = {}
        for nom, n, m in par_tarif_en_ligne:
            cumul[nom] = [n, m]
        for nom, (n, m) in hl_tarifs.items():
            c = cumul.setdefault(nom, [0, 0.0])
            c[0] += n
            c[1] += m
        par_tarif = sorted(
            ({"nom": nom, "vendus": int(n), "montant": float(m)} for nom, (n, m) in cumul.items() if n),
            key=lambda t: t["vendus"],
            reverse=True,
        )

        # --- public : acheteurs distincts (une personne peut acheter pour plusieurs)
        acheteurs = (
            await self.db.execute(
                select(Participant.id, Participant.genre, Participant.date_naissance)
                .where(
                    Participant.id.in_(
                        select(distinct(Reservation.participant_id)).where(
                            Reservation.evenement_id.in_(ids), Reservation.statut == "confirmee"
                        )
                    )
                )
            )
        ).all()
        genres: Dict[str, int] = {}
        tranches = {t[2]: 0 for t in TRANCHES}
        tranches["Âge non précisé"] = 0
        for _, genre, naissance in acheteurs:
            g = genre_normalise(genre)
            genres[g] = genres.get(g, 0) + 1
            if naissance:
                a = age(naissance, aujourd_hui)
                for mini, maxi, libelle in TRANCHES:
                    if mini <= a <= maxi:
                        tranches[libelle] += 1
                        break
            else:
                tranches["Âge non précisé"] += 1
        ordre_genres = ["Femmes", "Hommes", "Autre", "Non précisé"]

        return {
            "evenement_id": evenement_id,
            "indicateurs": {
                "billets_vendus": vendus,
                "recettes": sum(x["recettes"] for x in evenements),
                "entres": entres,
                # billets valables pas encore passés à l'entrée (en ligne et hors ligne, invitations comprises)
                "non_scannes": max(occupees - entres, 0),
                "capacite": capacite,
                "places_restantes": max(capacite - occupees_avec_capacite, 0) if capacite else None,
                "taux_remplissage": round(min(occupees_avec_capacite / capacite * 100, 100), 1) if capacite else None,
                "en_attente": int(en_attente),
                "participants": len(acheteurs),
            },
            "ventes_par_jour": ventes_par_jour,
            "par_tarif": par_tarif,
            "genres": [{"libelle": g, "nombre": genres[g]} for g in ordre_genres if genres.get(g)],
            "tranches_age": [{"libelle": k, "nombre": v} for k, v in tranches.items() if v or k != "Âge non précisé"],
            "evenements": sorted(evenements, key=lambda x: x["date_debut"], reverse=True),
            "hors_ligne": hors_ligne,
        }

    async def _hors_ligne(self, ids: List[int]) -> Dict:
        """Billets hors ligne du périmètre : totaux, détail par usage, et cumuls par événement et par tarif."""
        lignes = (
            await self.db.execute(
                select(
                    LotHorsLigne,
                    CategorieBillet.nom,
                    func.coalesce(func.sum(case((BilletHorsLigne.is_used.is_(True), 1), else_=0)), 0),
                    func.coalesce(func.sum(case((BilletHorsLigne.annule.is_(True), 1), else_=0)), 0),
                )
                .join(CategorieBillet, LotHorsLigne.categorie_billet_id == CategorieBillet.id)
                .outerjoin(BilletHorsLigne, BilletHorsLigne.lot_id == LotHorsLigne.id)
                .where(LotHorsLigne.evenement_id.in_(ids))
                .group_by(LotHorsLigne.id, CategorieBillet.nom)
            )
        ).all()
        libelles = {"depot": "Dépôt-vente", "guichet": "Guichet", "invitation": "Invitations"}
        par_type = {t: {"type": t, "libelle": l, "emis": 0, "vendus": 0, "entres": 0} for t, l in libelles.items()}
        par_ev: Dict[int, Dict] = {}
        par_tarif: Dict[str, List[float]] = {}
        total = {"emis": 0, "vendus": 0, "invitations": 0, "en_depot": 0, "entres": 0, "recettes": 0.0, "a_encaisser": 0.0, "frais_payes": 0.0}
        for lot, tarif, utilises, annules in lignes:
            utilises, annules = int(utilises), int(annules)
            valables = lot.quantite - annules
            if lot.type == "invitation":
                vendus = 0
            elif lot.statut == "regle":
                vendus = valables
            else:
                vendus = min(max(lot.vendus_declares or 0, utilises), valables)
            recettes = vendus * lot.prix_unitaire
            total["emis"] += valables
            total["vendus"] += vendus
            total["entres"] += utilises
            total["recettes"] += recettes
            total["frais_payes"] += lot.montant_frais
            if lot.type == "invitation":
                total["invitations"] += valables
            else:
                total["en_depot"] += valables - vendus  # billets encore chez le revendeur ou au guichet
                if lot.statut != "regle":
                    total["a_encaisser"] += recettes
            t = par_type[lot.type]
            t["emis"] += valables
            t["vendus"] += vendus
            t["entres"] += utilises
            ev = par_ev.setdefault(lot.evenement_id, {"vendus": 0, "valables": 0, "entres": 0, "recettes": 0.0})
            ev["vendus"] += vendus
            ev["valables"] += valables
            ev["entres"] += utilises
            ev["recettes"] += recettes
            if vendus:
                c = par_tarif.setdefault(tarif, [0, 0.0])
                c[0] += vendus
                c[1] += recettes
        return {
            **total,
            "non_scannes": total["emis"] - total["entres"],
            "par_type": [t for t in par_type.values() if t["emis"]],
            "_par_evenement": par_ev,
            "_par_tarif": par_tarif,
        }
