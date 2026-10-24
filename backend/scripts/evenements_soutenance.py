"""Événements à venir pour la soutenance (novembre 2026 à janvier 2027).

Les données de démonstration (scripts/donnees_demo.py) placent leurs événements par rapport au jour
où elles sont créées : à la date de la soutenance, certains sont déjà passés. Ce script ajoute des
événements validés à des DATES FIXES, de fin novembre 2026 à mi-janvier 2027 : quel que soit le jour de
la soutenance (novembre ou décembre), l'accueil a toujours des événements à venir, un compte à
rebours et des billets en vente.

Chaque événement a ses tarifs, son affiche et quelques ventes déjà faites par les participants de
démonstration ; le concert de Noël a aussi des propositions soumises au vote, avec réactions et
commentaires classés par le module d'IA.

Utilisation (dans backend, venv activé, après python -m scripts.donnees_demo) :
    python -m scripts.evenements_soutenance              ajoute les événements (refuse s'ils existent déjà)
    python -m scripts.evenements_soutenance --remplacer  supprime puis recrée ces événements
    python -m scripts.evenements_soutenance --supprimer  supprime ces événements seulement

Seuls les événements listés dans EVENEMENTS (et ce qui leur est rattaché) sont touchés.
"python -m scripts.donnees_demo --remplacer" les supprime aussi : relancer ensuite ce script.
"""
import argparse
import asyncio
import logging
import random
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select

from app.database import AsyncSessionLocal
from app.ia.sentiment import analyser
from app.models.artiste import Artiste
from app.models.billet import Billet
from app.models.categorie import Categorie
from app.models.categorie_billet import CategorieBillet
from app.models.evenement import Evenement
from app.models.interaction_publique import InteractionPublique, InteractionType
from app.models.lieu import Lieu
from app.models.notification import Notification
from app.models.paiement import Paiement
from app.models.participant import Participant
from app.models.proposition import Proposition, PropositionType
from app.models.recommandation import Recommandation
from app.models.reservation import Reservation
from app.models.user import User
from app.services.recommandation_service import RecommandationService
from app.utils.crypto import encrypt_data
from app.utils.fuseau import FUSEAU_MADAGASCAR

logging.getLogger("passlib").setLevel(logging.ERROR)

EMAIL_ORGANISATEUR = "demo.organisateur@guichetweb.mg"
DOMAINE_PARTICIPANTS = "@demo.guichetweb.mg"
REGION = "Haute Matsiatra"

# (titre, description, date et heure locales, durée h, lieu, catégorie, capacité, tarifs (nom, prix, quota), part vendue, affiche)
EVENEMENTS = [
    ("Fianar Rock Live", "Trois groupes de rock de la région sur une même scène, pour une soirée électrique au centre-ville.",
     datetime(2026, 11, 21, 19, 0), 4, "La Chaudière", "Concert", 200,
     [("Entrée", 15000, None), ("VIP avec boisson", 30000, 40)], 0.42, "/images/organisateur/bandeau-concert.jpg"),
    ("Danses traditionnelles du Betsileo", "Un après-midi de danses et de chants traditionnels, avec les troupes des villages de la région.",
     datetime(2026, 11, 28, 15, 0), 3, "Alliance Française de Fianarantsoa", "Spectacle traditionnel", 300,
     [("Adulte", 8000, None), ("Enfant", 3000, None)], 0.30, "/images/accueil/danseurs.jpg"),
    ("Concert de Noël à Fianarantsoa", "Le grand concert de fin d'année : chorales, artistes invités et ambiance de fête. "
     "Le public choisit la tête d'affiche : votez pour votre artiste préféré !",
     datetime(2026, 12, 19, 18, 0), 5, "L'Espace Royal Bateravola", "Concert", 600,
     [("Prévente", 20000, 300), ("Sur place", 25000, 200), ("VIP", 50000, 80)], 0.35, "/images/accueil/confettis-roses.jpg"),
    ("Réveillon du Nouvel An", "Dîner-spectacle et soirée dansante pour passer à 2027 : orchestre live, DJ et feu d'artifice à minuit.",
     datetime(2026, 12, 31, 20, 0), 6, "Zomatel Hotel-Restaurant", "Gala", 250,
     [("Dîner-spectacle", 60000, 200), ("Table VIP (prix par place)", 90000, 50)], 0.28, "/images/accueil/confettis-bleus.jpg"),
    ("Festival Hira Gasy de la nouvelle année", "Les meilleures troupes de hira gasy ouvrent l'année : kabary, chants et danses pour toute la famille.",
     datetime(2027, 1, 16, 14, 0), 5, "Stade de Fianarantsoa", "Hira gasy", 900,
     [("Tribune", 5000, 700), ("Tribune d'honneur", 15000, 200)], 0.12, "/images/accueil/foule-violette.jpg"),
]
TITRES = [e[0] for e in EVENEMENTS]

# vote du public sur le concert de Noël : (type, libellés, engagement de chaque option)
PROPOSITIONS = [
    ("Concert de Noël à Fianarantsoa", PropositionType.ARTISTE, ["Rossy", "Mahaleo", "Bodo"], [0.75, 0.6, 0.4]),
    ("Concert de Noël à Fianarantsoa", PropositionType.LIEU, ["L'Espace Royal Bateravola", "Stade de Fianarantsoa"], [0.6, 0.45]),
    ("Concert de Noël à Fianarantsoa", PropositionType.CATEGORIE, ["Concert"], [0.5]),
]
COMMENTAIRES = [
    "Trop hâte pour Noël !", "Tsara be ity !", "On viendra en famille", "Mahafinaritra !", "Excellent choix pour finir l'année",
    "Les billets seront à quel prix ?", "Il y aura un parking ?", "Trop cher pour des étudiants", "Lafo loatra",
]
REACTIONS = [(InteractionType.LIKE, 0.45), (InteractionType.JADORE, 0.25), (InteractionType.WAOUH, 0.15), (InteractionType.FAVORI, 0.15)]


def maintenant() -> datetime:
    return datetime.now(timezone.utc)


def en_utc(locale: datetime) -> datetime:
    return locale.replace(tzinfo=FUSEAU_MADAGASCAR).astimezone(timezone.utc)


async def trouver_ou_creer(db, modele, nom: str, **champs):
    obj = (await db.execute(select(modele).where(func.lower(modele.nom) == nom.lower()))).scalars().first()
    if obj is None:
        obj = modele(nom=nom, **champs)
        db.add(obj)
        await db.flush()
    return obj


async def supprimer(db) -> int:
    evs = [e for (e,) in await db.execute(select(Evenement.id).where(Evenement.titre.in_(TITRES)))]
    if not evs:
        return 0
    props = [p for (p,) in await db.execute(select(Proposition.id).where(Proposition.evenement_id.in_(evs)))]
    resas = [r for (r,) in await db.execute(select(Reservation.id).where(Reservation.evenement_id.in_(evs)))]
    await db.execute(delete(InteractionPublique).where(InteractionPublique.proposition_id.in_(props or [-1])))
    await db.execute(delete(Notification).where(Notification.reservation_id.in_(resas or [-1])))
    await db.execute(delete(Billet).where(Billet.reservation_id.in_(resas or [-1])))
    await db.execute(delete(Paiement).where(Paiement.reservation_id.in_(resas or [-1])))
    await db.execute(delete(Reservation).where(Reservation.id.in_(resas or [-1])))
    await db.execute(delete(Recommandation).where(Recommandation.evenement_id.in_(evs)))
    await db.execute(delete(Proposition).where(Proposition.id.in_(props or [-1])))
    await db.execute(delete(CategorieBillet).where(CategorieBillet.evenement_id.in_(evs)))
    await db.execute(delete(Evenement).where(Evenement.id.in_(evs)))
    await db.commit()
    return len(evs)


async def creer(db) -> None:
    rnd = random.Random(1219)
    orga = (await db.execute(select(User).where(User.email == EMAIL_ORGANISATEUR))).scalar_one_or_none()
    participants = list((await db.execute(select(Participant).where(Participant.email.like(f"%{DOMAINE_PARTICIPANTS}")))).scalars())
    if not orga or not participants:
        print("Lancez d'abord les données de démonstration : python -m scripts.donnees_demo")
        return

    evenements = {}
    nb_billets = 0
    for titre, description, quand_local, duree, nom_lieu, nom_cat, capacite, tarifs, taux, affiche in EVENEMENTS:
        lieu = await trouver_ou_creer(db, Lieu, nom_lieu, ville="Fianarantsoa", region=REGION)
        categorie = await trouver_ou_creer(db, Categorie, nom_cat)
        debut = en_utc(quand_local)
        e = Evenement(
            titre=titre, description=description, date_debut=debut, date_fin=debut + timedelta(hours=duree),
            capacite=capacite, statut_validation="valide", date_creation=maintenant() - timedelta(days=rnd.randint(18, 30)),
            nombre_vues=rnd.randint(250, 1800), lieu_id=lieu.id, categorie_id=categorie.id, organisateur_id=orga.id, image_url=affiche,
        )
        db.add(e)
        await db.flush()
        evenements[titre] = e
        cats = [CategorieBillet(nom=n, prix=p, quantite_disponible=q, evenement_id=e.id) for n, p, q in tarifs]
        db.add_all(cats)
        await db.flush()

        # ventes déjà faites : lots de 1 à 4 billets, depuis l'ouverture de la billetterie jusqu'à maintenant
        objectif, vendus = int(capacite * taux), 0
        par_tarif = {c.id: 0 for c in cats}
        debut_ventes = e.date_creation + timedelta(days=2)
        while vendus < objectif:
            ouverts = [c for c in cats if c.quantite_disponible is None or par_tarif[c.id] < c.quantite_disponible]
            if not ouverts:
                break
            c = rnd.choices(ouverts, weights=[3 if k == 0 else 1 for k in range(len(ouverts))])[0]
            n = min(rnd.choices([1, 2, 3, 4], weights=[45, 35, 12, 8])[0], objectif - vendus)
            if c.quantite_disponible is not None:
                n = min(n, c.quantite_disponible - par_tarif[c.id])
            quand = debut_ventes + (maintenant() - timedelta(minutes=30) - debut_ventes) * (rnd.random() ** 0.6)
            mode = rnd.choices(["mvola", "orange_money", "airtel_money"], weights=[55, 30, 15])[0]
            acheteur = rnd.choice(participants)
            lot = [Reservation(statut="confirmee", date_reservation=quand - timedelta(minutes=rnd.randint(1, 8)),
                               evenement_id=e.id, participant_id=acheteur.id, categorie_billet_id=c.id) for _ in range(n)]
            db.add_all(lot)
            await db.flush()
            for r in lot:
                db.add(Paiement(montant=c.prix, statut_paiement="paye", mode_paiement=mode, date_paiement=quand, reservation_id=r.id))
                numero = f"BLT-{uuid.uuid4().hex[:10].upper()}"
                db.add(Billet(numero_billet=numero, qr_code=encrypt_data(numero), is_used=False, date_emission=quand, reservation_id=r.id))
            vendus += n
            par_tarif[c.id] += n
        nb_billets += vendus

    # vote du public
    nb_reactions = 0
    for titre, type_, libelles, poids in PROPOSITIONS:
        e = evenements[titre]
        for libelle, engagement in zip(libelles, poids):
            lien = {}
            if type_ == PropositionType.LIEU:
                lien["lieu_id"] = (await trouver_ou_creer(db, Lieu, libelle, ville="Fianarantsoa", region=REGION)).id
            elif type_ == PropositionType.ARTISTE:
                lien["artiste_id"] = (await trouver_ou_creer(db, Artiste, libelle)).id
            else:
                lien["categorie_id"] = (await trouver_ou_creer(db, Categorie, libelle)).id
            prop = Proposition(type=type_, libelle=libelle, evenement_id=e.id, date_proposition=e.date_creation + timedelta(days=1), **lien)
            db.add(prop)
            await db.flush()
            for p in participants:
                if rnd.random() < engagement * 0.5:
                    t = rnd.choices([x for x, _ in REACTIONS], weights=[w for _, w in REACTIONS])[0]
                    db.add(InteractionPublique(type_interaction=t, proposition_id=prop.id, participant_id=p.id,
                                               date_interaction=maintenant() - timedelta(days=rnd.randint(0, 15), hours=rnd.randint(0, 23))))
                    nb_reactions += 1
                if rnd.random() < engagement * 0.05:
                    texte = rnd.choice(COMMENTAIRES)
                    a = analyser(texte)
                    db.add(InteractionPublique(type_interaction=InteractionType.COMMENTAIRE, contenu=texte, proposition_id=prop.id,
                                               sentiment=a.sentiment if a else None, confiance=a.confiance if a else None, participant_id=p.id,
                                               date_interaction=maintenant() - timedelta(days=rnd.randint(0, 15), hours=rnd.randint(0, 23))))
                    nb_reactions += 1
    await db.commit()
    try:
        await RecommandationService(db).calculer_recommandation(evenements["Concert de Noël à Fianarantsoa"].id)
        await db.commit()
    except ValueError:
        pass

    print("Événements de soutenance ajoutés (organisateur : Fianar Events) :")
    for titre, _, quand_local, *_ in EVENEMENTS:
        print(f"  {quand_local:%d/%m/%Y %H:%M}  {titre}")
    print(f"  {nb_billets} billets vendus, {nb_reactions} réactions et commentaires sur le concert de Noël")


async def principal(args) -> None:
    async with AsyncSessionLocal() as db:
        if args.supprimer:
            n = await supprimer(db)
            print(f"{n} événements de soutenance supprimés." if n else "Aucun événement de soutenance à supprimer.")
            return
        existe = (await db.execute(select(Evenement.id).where(Evenement.titre.in_(TITRES)))).first()
        if existe and not args.remplacer:
            print("Ces événements existent déjà. Utilisez --remplacer pour les recréer, ou --supprimer pour les retirer.")
            return
        if existe:
            await supprimer(db)
        await creer(db)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Événements à venir pour la soutenance guichetweb")
    groupe = parser.add_mutually_exclusive_group()
    groupe.add_argument("--remplacer", action="store_true", help="supprimer puis recréer ces événements")
    groupe.add_argument("--supprimer", action="store_true", help="supprimer ces événements")
    asyncio.run(principal(parser.parse_args()))
