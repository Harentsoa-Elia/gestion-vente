"""Administration : supervision de la plateforme, comptes, référentiel."""
from datetime import datetime, timedelta
from typing import Dict, List, Optional

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.roles import ROLE_ADMIN
from app.models.artiste import Artiste
from app.models.billet import Billet
from app.models.categorie import Categorie
from app.models.categorie_billet import CategorieBillet
from app.models.evenement import Evenement
from app.models.lieu import Lieu
from app.models.paiement import Paiement
from app.models.participant import Participant
from app.models.proposition import Proposition
from app.models.recommandation import Recommandation
from app.models.reservation import Reservation
from app.models.user import User
from app.utils.fuseau import FUSEAU_MADAGASCAR

TABLES = {"categories": (Categorie, "categorie_id"), "lieux": (Lieu, "lieu_id"), "artistes": (Artiste, "artiste_id")}


class ErreurAdministration(ValueError):
    pass


def ariary(n: float) -> str:
    return f"{int(round(n)):,} Ar".replace(",", " ")


class AdministrationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    # ---------- vue d'ensemble ----------
    async def vue_ensemble(self) -> Dict:
        db = self.db
        orga = (await db.execute(select(func.count(User.id), func.sum(case((User.actif.is_(False), 1), else_=0))))).one()
        part = (await db.execute(select(func.count(Participant.id), func.sum(case((Participant.email_verifie.is_(True), 1), else_=0))))).one()
        statuts = dict((await db.execute(select(Evenement.statut_validation, func.count(Evenement.id)).group_by(Evenement.statut_validation))).all())
        billets = (await db.execute(select(func.count(Billet.id), func.sum(case((Billet.is_used.is_(True), 1), else_=0))))).one()
        total = (await db.execute(select(func.coalesce(func.sum(Paiement.montant), 0)).where(Paiement.statut_paiement == "paye"))).scalar()

        aujourd_hui = datetime.now(FUSEAU_MADAGASCAR).date()
        debut = aujourd_hui - timedelta(days=29)
        jour = func.date(func.timezone("Indian/Antananarivo", Paiement.date_paiement))
        par_jour = {
            d: (int(n), float(m or 0))
            for d, n, m in (
                await db.execute(
                    select(jour, func.count(Paiement.id), func.sum(Paiement.montant))
                    .where(Paiement.statut_paiement == "paye", Paiement.date_paiement.isnot(None), jour >= debut)
                    .group_by(jour)
                )
            ).all()
        }
        ventes = [
            {"date": (debut + timedelta(days=k)).isoformat(), "billets": par_jour.get(debut + timedelta(days=k), (0, 0))[0], "montant": par_jour.get(debut + timedelta(days=k), (0, 0.0))[1]}
            for k in range(30)
        ]

        top = [
            {"id": i, "titre": t, "vendus": int(n), "recettes": float(m or 0)}
            for i, t, n, m in (
                await db.execute(
                    select(Evenement.id, Evenement.titre, func.count(Billet.id), func.sum(Paiement.montant))
                    .join(Reservation, Reservation.evenement_id == Evenement.id)
                    .join(Billet, Billet.reservation_id == Reservation.id)
                    .outerjoin(Paiement, Paiement.reservation_id == Reservation.id)
                    .group_by(Evenement.id, Evenement.titre)
                    .order_by(func.count(Billet.id).desc())
                    .limit(5)
                )
            ).all()
        ]

        return {
            "organisateurs": int(orga[0] or 0),
            "organisateurs_suspendus": int(orga[1] or 0),
            "participants": int(part[0] or 0),
            "participants_verifies": int(part[1] or 0),
            "evenements": {k: int(v) for k, v in statuts.items()},
            "billets_vendus": int(billets[0] or 0),
            "total_ventes": float(total or 0),
            "entrees": int(billets[1] or 0),
            "ventes_30_jours": ventes,
            "top_evenements": top,
            "activite": await self.activite(),
        }

    async def activite(self, limite: int = 15) -> List[Dict]:
        """Dernières actions sur la plateforme, reconstituées à partir des données (pas de journal séparé)."""
        db = self.db
        items: List[Dict] = []

        minute = func.date_trunc("minute", Paiement.date_paiement)
        for quand, prenom, nom, titre, ev_id, tarif, n, montant in (
            await db.execute(
                select(minute, Participant.prenom, Participant.nom, Evenement.titre, Evenement.id, CategorieBillet.nom, func.count(Paiement.id), func.sum(Paiement.montant))
                .join(Reservation, Paiement.reservation_id == Reservation.id)
                .join(Participant, Reservation.participant_id == Participant.id)
                .join(Evenement, Reservation.evenement_id == Evenement.id)
                .join(CategorieBillet, Reservation.categorie_billet_id == CategorieBillet.id)
                .where(Paiement.statut_paiement == "paye", Paiement.date_paiement.isnot(None))
                .group_by(minute, Participant.id, Participant.prenom, Participant.nom, Evenement.titre, Evenement.id, CategorieBillet.nom)
                .order_by(minute.desc())
                .limit(limite)
            )
        ).all():
            items.append(
                {
                    "type": "vente",
                    "date": quand,
                    "texte": f"{prenom} {nom[:1]}. a acheté {n} billet{'s' if n > 1 else ''} « {tarif} » pour {titre} ({ariary(montant or 0)})",
                    "lien": f"/evenements/{ev_id}",
                }
            )

        for quand, prenom, nom in (
            await db.execute(
                select(Participant.date_creation, Participant.prenom, Participant.nom)
                .where(Participant.date_creation.isnot(None))
                .order_by(Participant.date_creation.desc())
                .limit(limite)
            )
        ).all():
            items.append({"type": "inscription", "date": quand, "texte": f"Nouveau participant : {prenom} {nom[:1]}.", "lien": "/admin/utilisateurs?onglet=participants"})

        for quand, titre, statut, orga in (
            await db.execute(
                select(Evenement.date_creation, Evenement.titre, Evenement.statut_validation, User.fullname)
                .join(User, User.id == Evenement.organisateur_id, isouter=True)
                .order_by(Evenement.date_creation.desc())
                .limit(limite)
            )
        ).all():
            suite = {"en_attente_validation": " (en attente de validation)", "valide": " (validé)", "rejete": " (rejeté)"}.get(statut, "")
            items.append({"type": "evenement", "date": quand, "texte": f"{orga or 'Un organisateur'} a créé « {titre} »{suite}", "lien": "/admin/evenements"})

        minute_scan = func.date_trunc("minute", Billet.date_scan)
        for quand, titre, n in (
            await db.execute(
                select(minute_scan, Evenement.titre, func.count(Billet.id))
                .join(Reservation, Billet.reservation_id == Reservation.id)
                .join(Evenement, Reservation.evenement_id == Evenement.id)
                .where(Billet.date_scan.isnot(None))
                .group_by(minute_scan, Evenement.titre)
                .order_by(minute_scan.desc())
                .limit(limite)
            )
        ).all():
            items.append({"type": "entree", "date": quand, "texte": f"{n} entrée{'s' if n > 1 else ''} scannée{'s' if n > 1 else ''} à {titre}", "lien": None})

        items = [x for x in items if x["date"] is not None]
        items.sort(key=lambda x: x["date"], reverse=True)
        return items[:limite]

    # ---------- organisateurs (table users) ----------
    async def organisateurs(self) -> List[Dict]:
        db = self.db
        evs = {
            o: (int(n), int(v or 0), int(a or 0))
            for o, n, v, a in (
                await db.execute(
                    select(
                        Evenement.organisateur_id,
                        func.count(Evenement.id),
                        func.sum(case((Evenement.statut_validation == "valide", 1), else_=0)),
                        func.sum(case((Evenement.statut_validation == "en_attente_validation", 1), else_=0)),
                    ).group_by(Evenement.organisateur_id)
                )
            ).all()
        }
        ventes = {
            o: (int(n), float(m or 0))
            for o, n, m in (
                await db.execute(
                    select(Evenement.organisateur_id, func.count(Billet.id), func.sum(Paiement.montant))
                    .join(Reservation, Reservation.evenement_id == Evenement.id)
                    .join(Billet, Billet.reservation_id == Reservation.id)
                    .outerjoin(Paiement, Paiement.reservation_id == Reservation.id)
                    .group_by(Evenement.organisateur_id)
                )
            ).all()
        }
        users = (await db.execute(select(User).order_by(User.role, User.fullname))).scalars().all()
        return [
            {
                "id": u.id,
                "fullname": u.fullname,
                "email": u.email,
                "role": u.role,
                "actif": u.actif is not False,
                "evenements": evs.get(u.id, (0, 0, 0))[0],
                "evenements_valides": evs.get(u.id, (0, 0, 0))[1],
                "evenements_en_attente": evs.get(u.id, (0, 0, 0))[2],
                "billets_vendus": ventes.get(u.id, (0, 0.0))[0],
                "total_ventes": ventes.get(u.id, (0, 0.0))[1],
            }
            for u in users
        ]

    async def creer_organisateur(self, fullname: str, email: str, mot_de_passe_hache: str, role: str) -> User:
        if (await self.db.execute(select(User.id).where(func.lower(User.email) == email.lower()))).scalar():
            raise ErreurAdministration("Un compte utilise déjà cette adresse e-mail.")
        u = User(fullname=fullname.strip(), email=email.strip(), password=mot_de_passe_hache, role=role, actif=True)
        self.db.add(u)
        await self.db.commit()
        return u

    async def modifier_organisateur(self, admin_id: int, user_id: int, role: Optional[str], actif: Optional[bool]) -> None:
        u = await self.db.get(User, user_id)
        if not u:
            raise ErreurAdministration("Compte introuvable.")
        if user_id == admin_id and (role not in (None, ROLE_ADMIN) or actif is False):
            raise ErreurAdministration("Vous ne pouvez pas retirer vos propres droits d'administrateur ni suspendre votre compte.")
        if role is not None:
            u.role = role
        if actif is not None:
            u.actif = actif
        await self.db.commit()

    async def supprimer_organisateur(self, admin_id: int, user_id: int) -> None:
        if user_id == admin_id:
            raise ErreurAdministration("Vous ne pouvez pas supprimer votre propre compte.")
        u = await self.db.get(User, user_id)
        if not u:
            raise ErreurAdministration("Compte introuvable.")
        n = (await self.db.execute(select(func.count(Evenement.id)).where(Evenement.organisateur_id == user_id))).scalar()
        if n:
            raise ErreurAdministration(f"Ce compte a {n} événement{'s' if n > 1 else ''} : suspendez-le plutôt que de le supprimer.")
        await self.db.delete(u)
        await self.db.commit()

    # ---------- participants ----------
    async def participants(self) -> List[Dict]:
        achats = {
            p: (int(n), float(m or 0))
            for p, n, m in (
                await self.db.execute(
                    select(Reservation.participant_id, func.count(Billet.id), func.sum(Paiement.montant))
                    .join(Billet, Billet.reservation_id == Reservation.id)
                    .outerjoin(Paiement, Paiement.reservation_id == Reservation.id)
                    .group_by(Reservation.participant_id)
                )
            ).all()
        }
        ps = (await self.db.execute(select(Participant).order_by(Participant.date_creation.desc().nullslast(), Participant.id.desc()))).scalars().all()
        return [
            {
                "id": p.id,
                "prenom": p.prenom,
                "nom": p.nom,
                "email": p.email,
                "telephone": p.telephone,
                "genre": p.genre,
                "date_naissance": p.date_naissance,
                "email_verifie": bool(p.email_verifie),
                "statut": p.statut or "actif",
                "date_creation": p.date_creation,
                "billets": achats.get(p.id, (0, 0.0))[0],
                "total_depense": achats.get(p.id, (0, 0.0))[1],
            }
            for p in ps
        ]

    async def modifier_participant(self, participant_id: int, statut: str) -> None:
        p = await self.db.get(Participant, participant_id)
        if not p:
            raise ErreurAdministration("Participant introuvable.")
        p.statut = statut
        await self.db.commit()

    # ---------- référentiel ----------
    async def _utilisations(self, colonne_ev: Optional[str], colonne_prop: str) -> Dict[int, int]:
        compte: Dict[int, int] = {}
        if colonne_ev:
            col = getattr(Evenement, colonne_ev)
            for i, n in (await self.db.execute(select(col, func.count(Evenement.id)).where(col.isnot(None)).group_by(col))).all():
                compte[i] = compte.get(i, 0) + int(n)
        col = getattr(Proposition, colonne_prop)
        for i, n in (await self.db.execute(select(col, func.count(Proposition.id)).where(col.isnot(None)).group_by(col))).all():
            compte[i] = compte.get(i, 0) + int(n)
        return compte

    async def referentiel(self) -> Dict:
        u_cat = await self._utilisations("categorie_id", "categorie_id")
        u_lieu = await self._utilisations("lieu_id", "lieu_id")
        u_art = await self._utilisations(None, "artiste_id")
        cats = (await self.db.execute(select(Categorie).order_by(Categorie.nom))).scalars().all()
        lieux = (await self.db.execute(select(Lieu).order_by(Lieu.nom))).scalars().all()
        arts = (await self.db.execute(select(Artiste).order_by(Artiste.nom))).scalars().all()
        return {
            "categories": [{"id": c.id, "nom": c.nom, "detail": c.description, "utilisations": u_cat.get(c.id, 0)} for c in cats],
            "lieux": [
                {
                    "id": l.id,
                    "nom": l.nom,
                    "detail": ", ".join(x for x in [l.adresse, l.ville, l.region] if x) or None,
                    "utilisations": u_lieu.get(l.id, 0),
                }
                for l in lieux
            ],
            "artistes": [{"id": a.id, "nom": a.nom, "detail": a.genre_artistique, "utilisations": u_art.get(a.id, 0)} for a in arts],
        }

    async def supprimer_element(self, table: str, element_id: int) -> str:
        if table not in TABLES:
            raise ErreurAdministration("Type inconnu.")
        modele, colonne = TABLES[table]
        element = await self.db.get(modele, element_id)
        if not element:
            raise ErreurAdministration("Élément introuvable.")
        n = (await self._utilisations(None if table == "artistes" else colonne, colonne)).get(element_id, 0)
        if n:
            raise ErreurAdministration(f"« {element.nom} » est utilisé par {n} événement{'s' if n > 1 else ''} ou proposition{'s' if n > 1 else ''} : il ne peut pas être supprimé.")
        col_reco = getattr(Recommandation, colonne)
        if (await self.db.execute(select(func.count(Recommandation.id)).where(col_reco == element_id))).scalar():
            raise ErreurAdministration(f"« {element.nom} » figure dans des recommandations : il ne peut pas être supprimé.")
        nom = element.nom
        await self.db.delete(element)
        await self.db.commit()
        return nom
