"""Données de démonstration pour la soutenance.

Crée un organisateur « Fianar Events » avec des événements à Fianarantsoa (passés, à venir,
en attente de validation, brouillon), des participants au public varié (genre, âge), des ventes
étalées sur plusieurs semaines, des entrées scannées pour les événements passés, et des
propositions soumises au vote avec les réactions et commentaires du public.

Utilisation (dans backend, venv activé, base configurée par .env) :
    python -m scripts.donnees_demo              crée les données (refuse si elles existent déjà)
    python -m scripts.donnees_demo --remplacer  supprime puis recrée les données de démonstration
    python -m scripts.donnees_demo --supprimer  supprime les données de démonstration

Tout ce qui est créé est rattaché au compte demo.organisateur@guichetweb.mg ou à des participants
en @demo.guichetweb.mg : la suppression ne touche à rien d'autre. Mot de passe des comptes : demo1234.

Comptes personnels (pour la démonstration en direct : achat, e-mail du billet, scan du QR code) :
ajouter dans backend/.env une ligne, sans la publier sur GitHub :
    DEMO_COMPTES_PERSONNELS=adresse1@gmail.com=Prénom Nom,adresse2@gmail.com=Prénom Nom
Chaque adresse devient (ou reste) un compte participant à l'e-mail confirmé, avec un billet
à venir et un billet déjà utilisé sur des événements de démonstration. Un compte qui existait
déjà garde son mot de passe ; un compte créé par le script a le mot de passe demo1234.
« --supprimer » retire ces billets de démonstration mais jamais ces comptes personnels.
"""
import argparse
import asyncio
import logging
import os
import random
import uuid
from datetime import date, datetime, timedelta, timezone
from typing import Dict, List

from passlib.context import CryptContext
from sqlalchemy import delete, func, or_, select

from app.database import AsyncSessionLocal
from app.models.artiste import Artiste
from app.models.billet import Billet
from app.models.categorie import Categorie
from app.models.categorie_billet import CategorieBillet
from app.models.code_email import CodeEmail
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

# passlib signale inutilement la version de bcrypt (avertissement sans conséquence)
logging.getLogger("passlib").setLevel(logging.ERROR)

EMAIL_ORGANISATEUR = "demo.organisateur@guichetweb.mg"
# billets offerts aux comptes personnels : (événement, tarif, déjà scanné à l'entrée)
BILLETS_PERSONNELS = [("Salegy Night à Bateravola", "Prévente", False), ("Fianar Jazz Night", "Entrée", True)]
DOMAINE_PARTICIPANTS = "@demo.guichetweb.mg"
MOT_DE_PASSE = "demo1234"
NB_PARTICIPANTS = 180
REGION = "Haute Matsiatra"

PRENOMS_F = ["Hanitra", "Voahirana", "Fanja", "Mialy", "Tiana", "Lalaina", "Onja", "Nomena", "Ravaka", "Soa", "Haingo", "Fitiavana",
             "Miora", "Tahina", "Anjara", "Sarobidy", "Zo", "Hery", "Kanto", "Njara", "Rindra", "Fenitra", "Holy", "Vola"]
PRENOMS_H = ["Andry", "Tojo", "Rado", "Hasina", "Faniry", "Mamy", "Toky", "Njaka", "Rija", "Fetra", "Lova", "Tsiry",
             "Mahery", "Aina", "Solofo", "Naina", "Ando", "Heritiana", "Fy", "Tovo", "Ony", "Sitraka", "Mika", "Diary"]
NOMS = ["Rakotomalala", "Randriamampionona", "Rasoanaivo", "Andrianarisoa", "Razafindrakoto", "Rabemananjara", "Ranaivoson",
        "Rakotondrabe", "Andriamanana", "Rasolofoniaina", "Ratsimbazafy", "Razanakolona", "Randrianarivelo", "Rafanomezantsoa",
        "Rajaonarison", "Ravelojaona", "Andrianjafy", "Ramanantsoa", "Rakotoarisoa", "Rabearivelo"]
COMMENTAIRES = [
    "Trop hâte !", "On sera là avec toute la bande 🎉", "Tsara be ity !", "Mankasitraka ny mpikarakara",
    "Excellent choix, ça va être une belle soirée", "Enfin un grand événement à Fianar !", "Je vote pour ça sans hésiter",
    "Parfait pour l'ambiance", "Mahafinaritra !", "Ce serait génial", "Venez nombreux !", "Bravo pour l'organisation",
]

# (titre, description, jours par rapport à aujourd'hui, heure, durée h, lieu, catégorie, statut, capacité, tarifs, taux de vente)
EVENEMENTS = [
    ("Fianar Jazz Night", "Une soirée jazz intimiste avec des musiciens de la région : standards, compositions et jam session en fin de soirée.",
     -38, 19, 4, "La Chaudière", "Concert", "valide", 150, [("Entrée", 15000, None), ("VIP avec boisson", 30000, 30)], 0.86),
    ("Festival Hira Gasy de Fianarantsoa", "Deux troupes de hira gasy s'affrontent en kabary, chants et danses : une journée de tradition pour toute la famille.",
     -17, 14, 5, "Stade de Fianarantsoa", "Hira gasy", "valide", 900, [("Tribune", 5000, 700), ("Tribune d'honneur", 15000, 200)], 0.78),
    ("Salegy Night à Bateravola", "La grande soirée salegy de la rentrée : DJ, danseurs et concert live jusqu'au bout de la nuit.",
     12, 20, 6, "L'Espace Royal Bateravola", "Soirée / Clubbing", "valide", 700, [("Prévente", 20000, 300), ("Sur place", 25000, 300), ("VIP", 50000, 100)], 0.46),
    ("Acoustique au Rova", "Concert acoustique en petit comité, guitare et valiha, avec vue sur la ville haute.",
     26, 18, 3, "La Table du Rova", "Concert", "valide", 120, [("Place assise", 25000, None)], 0.33),
    ("Festival des Musiques de la Haute Matsiatra", "Trois jours de concerts pour célébrer les musiques de Madagascar. Le public choisit le lieu, "
     "les têtes d'affiche et le type de soirée : votez pour vos préférés !",
     58, 15, 8, None, "Festival", "valide", 1500, [("Pass 1 jour", 15000, None), ("Pass 3 jours", 35000, 500), ("VIP 3 jours", 80000, 100)], 0.12),
    ("Rire à Fianar : stand-up malagasy", "Une soirée d'humour avec les meilleurs humoristes de la scène malagasy.",
     40, 19, 3, "Zomatel Hotel-Restaurant", "Humour / Stand-up", "en_attente_validation", 250, [("Entrée", 10000, None)], 0.0),
    ("Gala de fin d'année", "Dîner-spectacle pour clôturer l'année (programme en préparation).",
     84, 19, 5, "Résidence Matsiatra", "Gala", "brouillon", 200, [], 0.0),
]

# affiches : photos neutres du projet (front-office/public/images), sans nom ni date d'un vrai événement.
# Le brouillon n'en a pas : on peut montrer l'ajout d'une affiche pendant la démonstration.
AFFICHES = {
    "Fianar Jazz Night": "/images/organisateur/bandeau-concert.jpg",
    "Festival Hira Gasy de Fianarantsoa": "/images/accueil/danseurs.jpg",
    "Salegy Night à Bateravola": "/images/accueil/confettis-roses.jpg",
    "Acoustique au Rova": "/images/accueil/foule-violette.jpg",
    "Festival des Musiques de la Haute Matsiatra": "/images/accueil/confettis-bleus.jpg",
    "Rire à Fianar : stand-up malagasy": "/images/accueil/scene-dj.jpg",
}
# visuels des propositions de lieux (les autres gardent l'image prévue par le site)
VISUELS_PROPOSITIONS = {
    "Stade de Fianarantsoa": "/images/test/lieu.jpg",
    "Le Coliseum d'Ambatomena": "/images/test/lieu-coliseum.jpg",
    "L'Espace Royal Bateravola": "/images/accueil/foule-violette.jpg",
}

# propositions soumises au vote : (titre de l'événement, type, libellés, poids d'engagement de chaque option)
PROPOSITIONS = [
    ("Festival des Musiques de la Haute Matsiatra", PropositionType.LIEU, ["Stade de Fianarantsoa", "L'Espace Royal Bateravola", "Le Coliseum d'Ambatomena"], [0.9, 0.55, 0.3]),
    ("Festival des Musiques de la Haute Matsiatra", PropositionType.ARTISTE, ["Mahaleo", "Rossy", "Jaojoby", "Erick Manana"], [0.85, 0.6, 0.5, 0.35]),
    ("Festival des Musiques de la Haute Matsiatra", PropositionType.CATEGORIE, ["Concert", "Festival", "Spectacle traditionnel"], [0.5, 0.7, 0.4]),
    ("Salegy Night à Bateravola", PropositionType.ARTISTE, ["Jaojoby", "Tence Mena", "Wawa"], [0.8, 0.55, 0.45]),
    ("Acoustique au Rova", PropositionType.ARTISTE, ["Erick Manana", "Rajery", "Justin Vali"], [0.6, 0.7, 0.35]),
    # en attente de validation : il a déjà une proposition de chaque type (règle de soumission),
    # et pourra être resoumis s'il est rejeté pendant la démonstration
    ("Rire à Fianar : stand-up malagasy", PropositionType.LIEU, ["Zomatel Hotel-Restaurant", "Alliance Française de Fianarantsoa"], [0.5, 0.4]),
    ("Rire à Fianar : stand-up malagasy", PropositionType.ARTISTE, ["Les Tontons du Rire", "Kolektif Mampihomehy"], [0.45, 0.35]),
    ("Rire à Fianar : stand-up malagasy", PropositionType.CATEGORIE, ["Humour / Stand-up"], [0.4]),
]

REACTIONS = [(InteractionType.LIKE, 0.45), (InteractionType.JADORE, 0.25), (InteractionType.WAOUH, 0.15), (InteractionType.FAVORI, 0.15)]


def maintenant() -> datetime:
    return datetime.now(timezone.utc)


def date_evenement(jours: int, heure: int) -> datetime:
    """Date locale (Madagascar) à l'heure donnée, convertie en UTC."""
    jour = datetime.now(FUSEAU_MADAGASCAR).date() + timedelta(days=jours)
    return datetime(jour.year, jour.month, jour.day, heure, 0, tzinfo=FUSEAU_MADAGASCAR).astimezone(timezone.utc)


async def trouver_ou_creer(db, modele, nom: str, **champs):
    obj = (await db.execute(select(modele).where(func.lower(modele.nom) == nom.lower()))).scalars().first()
    if obj is None:
        obj = modele(nom=nom, **champs)
        db.add(obj)
        await db.flush()
    return obj


def comptes_personnels() -> List[tuple]:
    """DEMO_COMPTES_PERSONNELS=adresse=Prénom Nom,adresse2=Prénom Nom (prénom et nom facultatifs)."""
    comptes = []
    for morceau in os.getenv("DEMO_COMPTES_PERSONNELS", "").split(","):
        if "@" not in morceau:
            continue
        email, _, nom_complet = morceau.partition("=")
        mots = nom_complet.split()
        prenom = mots[0] if mots else email.split("@")[0].rstrip("0123456789").capitalize()
        nom = " ".join(mots[1:]) or "Participant"
        comptes.append((email.strip().lower(), prenom, nom))
    return comptes


async def preparer_comptes_personnels(db, evenements: Dict[str, Evenement], hache: str, rnd: random.Random) -> List[str]:
    lignes = []
    for email, prenom, nom in comptes_personnels():
        p = (await db.execute(select(Participant).where(func.lower(Participant.email) == email))).scalar_one_or_none()
        if p is None:
            p = Participant(prenom=prenom, nom=nom, email=email, mot_de_passe=hache, genre=None, statut="actif", email_verifie=True)
            db.add(p)
            await db.flush()
            etat = f"créé (mot de passe {MOT_DE_PASSE})"
        else:
            p.email_verifie = True  # l'achat exige une adresse confirmée
            etat = "existant (mot de passe inchangé)"
        for titre, nom_tarif, scanne in BILLETS_PERSONNELS:
            e = evenements.get(titre)
            tarif = (
                await db.execute(select(CategorieBillet).where(CategorieBillet.evenement_id == e.id, CategorieBillet.nom == nom_tarif))
            ).scalar_one_or_none() if e else None
            if not tarif:
                continue
            quand = min(maintenant() - timedelta(days=rnd.randint(2, 6)), e.date_debut - timedelta(days=2))
            r = Reservation(statut="confirmee", date_reservation=quand, evenement_id=e.id, participant_id=p.id, categorie_billet_id=tarif.id)
            db.add(r)
            await db.flush()
            db.add(Paiement(montant=tarif.prix, statut_paiement="paye", mode_paiement="mvola", date_paiement=quand, reservation_id=r.id))
            numero = f"BLT-{uuid.uuid4().hex[:10].upper()}"
            db.add(Billet(numero_billet=numero, qr_code=encrypt_data(numero), is_used=scanne, date_emission=quand,
                          date_scan=e.date_debut + timedelta(minutes=12) if scanne else None, reservation_id=r.id))
        lignes.append(f"  compte personnel {email} : {etat}, {len(BILLETS_PERSONNELS)} billets de démonstration")
    return lignes


async def supprimer(db) -> bool:
    orga = (await db.execute(select(User).where(User.email == EMAIL_ORGANISATEUR))).scalar_one_or_none()
    parts = [p for (p,) in (await db.execute(select(Participant.id).where(Participant.email.like(f"%{DOMAINE_PARTICIPANTS}")))).all()]
    evs = [e for (e,) in (await db.execute(select(Evenement.id).where(Evenement.organisateur_id == orga.id)))] if orga else []
    if not orga and not parts:
        return False
    props = [p for (p,) in (await db.execute(select(Proposition.id).where(Proposition.evenement_id.in_(evs or [-1]))))]
    resas = [
        r
        for (r,) in (
            await db.execute(select(Reservation.id).where(or_(Reservation.evenement_id.in_(evs or [-1]), Reservation.participant_id.in_(parts or [-1]))))
        )
    ]
    await db.execute(delete(InteractionPublique).where(or_(InteractionPublique.proposition_id.in_(props or [-1]), InteractionPublique.participant_id.in_(parts or [-1]))))
    await db.execute(delete(Notification).where(or_(Notification.reservation_id.in_(resas or [-1]), Notification.organisateur_id == (orga.id if orga else -1))))
    await db.execute(delete(Billet).where(Billet.reservation_id.in_(resas or [-1])))
    await db.execute(delete(Paiement).where(Paiement.reservation_id.in_(resas or [-1])))
    await db.execute(delete(Reservation).where(Reservation.id.in_(resas or [-1])))
    await db.execute(delete(Recommandation).where(Recommandation.evenement_id.in_(evs or [-1])))
    await db.execute(delete(Proposition).where(Proposition.id.in_(props or [-1])))
    await db.execute(delete(CategorieBillet).where(CategorieBillet.evenement_id.in_(evs or [-1])))
    await db.execute(delete(Evenement).where(Evenement.id.in_(evs or [-1])))
    await db.execute(delete(CodeEmail).where(CodeEmail.email.like(f"%{DOMAINE_PARTICIPANTS}")))
    await db.execute(delete(Participant).where(Participant.id.in_(parts or [-1])))
    if orga:
        await db.delete(orga)
    await db.commit()
    print(f"Données de démonstration supprimées : {len(evs)} événements, {len(parts)} participants, {len(resas)} réservations.")
    return True


async def creer(db) -> None:
    rnd = random.Random(2026)
    hache = CryptContext(schemes=["bcrypt"], deprecated="auto").hash(MOT_DE_PASSE)

    orga = User(fullname="Fianar Events", email=EMAIL_ORGANISATEUR, password=hache, role="organisateur", actif=True)
    db.add(orga)
    await db.flush()

    # --- participants : genre et âge variés, inscrits au fil des deux derniers mois
    participants: List[Participant] = []
    aujourd_hui = date.today()
    for i in range(NB_PARTICIPANTS):
        femme = rnd.random() < 0.54
        prenom = rnd.choice(PRENOMS_F if femme else PRENOMS_H)
        nom = rnd.choice(NOMS)
        age = int(min(max(rnd.gauss(28, 8), 16), 62))
        naissance = aujourd_hui - timedelta(days=age * 365 + rnd.randint(0, 364))
        p = Participant(
            nom=nom,
            prenom=prenom,
            email=f"{prenom.lower()}.{nom.lower()}{i}{DOMAINE_PARTICIPANTS}",
            mot_de_passe=hache,
            telephone=f"03{rnd.choice('2348')} {rnd.randint(10, 99)} {rnd.randint(100, 999)} {rnd.randint(10, 99)}",
            date_naissance=naissance if rnd.random() > 0.06 else None,
            genre=("Feminin" if femme else "Masculin") if rnd.random() > 0.04 else None,
            statut="actif",
            email_verifie=True,
            date_creation=maintenant() - timedelta(days=rnd.randint(0, 62), hours=rnd.randint(0, 23)),
        )
        participants.append(p)
    db.add_all(participants)
    await db.flush()

    # --- événements et tarifs
    evenements: Dict[str, Evenement] = {}
    nb_billets = 0
    for titre, description, jours, heure, duree, nom_lieu, nom_cat, statut, capacite, tarifs, taux in EVENEMENTS:
        lieu = await trouver_ou_creer(db, Lieu, nom_lieu, ville="Fianarantsoa", region=REGION) if nom_lieu else None
        categorie = await trouver_ou_creer(db, Categorie, nom_cat)
        debut = date_evenement(jours, heure)
        e = Evenement(
            titre=titre,
            description=description,
            date_debut=debut,
            date_fin=debut + timedelta(hours=duree),
            capacite=capacite,
            statut_validation=statut,
            # créé 45 à 60 jours avant, et jamais dans le futur (les ventes commencent 3 jours après)
            date_creation=min(debut - timedelta(days=rnd.randint(45, 60)), maintenant() - timedelta(days=rnd.randint(25, 35))),
            nombre_vues=rnd.randint(300, 2500) if statut == "valide" else rnd.randint(0, 20),
            lieu_id=lieu.id if lieu else None,
            categorie_id=categorie.id,
            organisateur_id=orga.id,
            image_url=AFFICHES.get(titre),
        )
        db.add(e)
        await db.flush()
        evenements[titre] = e
        cats = []
        for nom, prix, quota in tarifs:
            c = CategorieBillet(nom=nom, prix=prix, quantite_disponible=quota, evenement_id=e.id)
            db.add(c)
            cats.append(c)
        await db.flush()
        if not cats or taux <= 0:
            continue

        # --- ventes : lots de 1 à 4 billets, plus nombreuses à l'approche de l'événement
        objectif = int(capacite * taux)
        debut_ventes = e.date_creation + timedelta(days=3)
        fin_ventes = min(maintenant() - timedelta(minutes=30), debut - timedelta(hours=1))
        vendus_par_tarif = {c.id: 0 for c in cats}
        passe = debut < maintenant()
        vendus = 0
        while vendus < objectif:
            tarifs_ouverts = [c for c in cats if c.quantite_disponible is None or vendus_par_tarif[c.id] < c.quantite_disponible]
            if not tarifs_ouverts:
                break
            c = rnd.choices(tarifs_ouverts, weights=[3 if k == 0 else 1 for k in range(len(tarifs_ouverts))])[0]
            n = min(rnd.choices([1, 2, 3, 4], weights=[45, 35, 12, 8])[0], objectif - vendus)
            if c.quantite_disponible is not None:
                n = min(n, c.quantite_disponible - vendus_par_tarif[c.id])
            acheteur = rnd.choice(participants)
            # date de paiement : répartition croissante vers la date de l'événement
            fraction = rnd.random() ** 0.55
            quand = debut_ventes + (fin_ventes - debut_ventes) * fraction
            mode = rnd.choices(["mvola", "orange_money", "airtel_money"], weights=[55, 30, 15])[0]
            lot = [
                Reservation(statut="confirmee", date_reservation=quand - timedelta(minutes=rnd.randint(1, 8)),
                            evenement_id=e.id, participant_id=acheteur.id, categorie_billet_id=c.id)
                for _ in range(n)
            ]
            db.add_all(lot)
            await db.flush()
            for r in lot:
                db.add(Paiement(montant=c.prix, statut_paiement="paye", mode_paiement=mode, date_paiement=quand, reservation_id=r.id))
                numero = f"BLT-{uuid.uuid4().hex[:10].upper()}"
                utilise = passe and rnd.random() < 0.9
                db.add(
                    Billet(
                        numero_billet=numero,
                        qr_code=encrypt_data(numero),
                        is_used=utilise,
                        date_scan=debut + timedelta(minutes=rnd.randint(-30, 150)) if utilise else None,
                        date_emission=quand,
                        reservation_id=r.id,
                    )
                )
            vendus += n
            vendus_par_tarif[c.id] += n
        nb_billets += vendus

    # --- comptes personnels (démonstration en direct)
    lignes_personnelles = await preparer_comptes_personnels(db, evenements, hache, rnd)

    # --- propositions et réactions du public
    nb_reactions = 0
    for titre, type_, libelles, poids in PROPOSITIONS:
        e = evenements[titre]
        for libelle, p_engagement in zip(libelles, poids):
            lien = {}
            if type_ == PropositionType.LIEU:
                lien["lieu_id"] = (await trouver_ou_creer(db, Lieu, libelle, ville="Fianarantsoa", region=REGION)).id
            elif type_ == PropositionType.ARTISTE:
                lien["artiste_id"] = (await trouver_ou_creer(db, Artiste, libelle)).id
            else:
                lien["categorie_id"] = (await trouver_ou_creer(db, Categorie, libelle)).id
            prop = Proposition(type=type_, libelle=libelle, evenement_id=e.id, date_proposition=e.date_creation + timedelta(days=1),
                               image_url=VISUELS_PROPOSITIONS.get(libelle) if type_ == PropositionType.LIEU else None, **lien)
            db.add(prop)
            await db.flush()
            for p in participants:
                if rnd.random() < p_engagement * 0.55:
                    t = rnd.choices([x for x, _ in REACTIONS], weights=[w for _, w in REACTIONS])[0]
                    db.add(InteractionPublique(type_interaction=t, proposition_id=prop.id, participant_id=p.id,
                                               date_interaction=maintenant() - timedelta(days=rnd.randint(0, 30), hours=rnd.randint(0, 23))))
                    nb_reactions += 1
                if rnd.random() < p_engagement * 0.06:
                    db.add(InteractionPublique(type_interaction=InteractionType.COMMENTAIRE, contenu=rnd.choice(COMMENTAIRES), proposition_id=prop.id,
                                               participant_id=p.id, date_interaction=maintenant() - timedelta(days=rnd.randint(0, 30), hours=rnd.randint(0, 23))))
                    nb_reactions += 1

    await db.commit()

    # --- recommandations calculées, comme avec le bouton « Calculer » de l'organisateur
    nb_reco = 0
    for titre in {t for t, *_ in PROPOSITIONS}:
        try:
            await RecommandationService(db).calculer_recommandation(evenements[titre].id)
            nb_reco += 1
        except ValueError:
            pass
    await db.commit()

    print("Données de démonstration créées :")
    print(f"  organisateur : {EMAIL_ORGANISATEUR} (mot de passe {MOT_DE_PASSE})")
    print(f"  {len(evenements)} événements, {len(participants)} participants, {nb_billets} billets vendus, {nb_reactions} réactions et commentaires")
    print(f"  {nb_reco} recommandations calculées")
    for ligne in lignes_personnelles:
        print(ligne)
    print(f"  participants : adresses en {DOMAINE_PARTICIPANTS}, mot de passe {MOT_DE_PASSE}")


async def principal(args) -> None:
    async with AsyncSessionLocal() as db:
        if args.supprimer:
            if not await supprimer(db):
                print("Aucune donnée de démonstration à supprimer.")
            return
        existe = (await db.execute(select(User.id).where(User.email == EMAIL_ORGANISATEUR))).scalar()
        if existe and not args.remplacer:
            print("Les données de démonstration existent déjà. Utilisez --remplacer pour les recréer, ou --supprimer pour les retirer.")
            return
        if existe:
            await supprimer(db)
        await creer(db)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Données de démonstration guichetweb")
    groupe = parser.add_mutually_exclusive_group()
    groupe.add_argument("--remplacer", action="store_true", help="supprimer puis recréer les données de démonstration")
    groupe.add_argument("--supprimer", action="store_true", help="supprimer les données de démonstration")
    asyncio.run(principal(parser.parse_args()))
