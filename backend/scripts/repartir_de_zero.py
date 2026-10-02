"""Remet la base à zéro avant la soutenance, en gardant l'essentiel.

GARDE :
  - les comptes administrateurs ;
  - les comptes listés dans DEMO_COMPTES_PERSONNELS (backend/.env), organisateur et/ou participant,
    avec leur mot de passe ;
  - le référentiel : lieux, artistes, types d'événement ;
SUPPRIME :
  - tous les événements, avec leurs tarifs, propositions, réactions, recommandations,
    réservations, paiements, billets et notifications ;
  - tous les autres comptes : organisateurs et participants de test, données de démonstration.

Action définitive : faire une sauvegarde de la base avant (pgAdmin, clic droit sur la base, Backup...).

Utilisation (dans backend, venv activé) :
    python -m scripts.repartir_de_zero        affiche ce qui sera supprimé et demande de taper OUI
    python -m scripts.donnees_demo            puis recrée les données de démonstration
"""
import argparse
import asyncio

from sqlalchemy import delete, func, select

from app.database import AsyncSessionLocal
from app.models.billet import Billet
from app.models.categorie_billet import CategorieBillet
from app.models.code_email import CodeEmail
from app.models.evenement import Evenement
from app.models.interaction_publique import InteractionPublique
from app.models.notification import Notification
from app.models.paiement import Paiement
from app.models.participant import Participant
from app.models.proposition import Proposition
from app.models.recommandation import Recommandation
from app.models.reservation import Reservation
from app.models.user import User
from scripts.donnees_demo import comptes_personnels


async def principal(confirme: bool) -> None:
    gardes = {email for email, _, _ in comptes_personnels()}
    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User))).scalars().all()
        users_gardes = [u for u in users if u.role == "admin" or u.email.lower() in gardes]
        users_suppr = [u for u in users if u not in users_gardes]
        parts = (await db.execute(select(Participant))).scalars().all()
        parts_gardes = [p for p in parts if p.email.lower() in gardes]
        nb_evenements = (await db.execute(select(func.count(Evenement.id)))).scalar()
        nb_billets = (await db.execute(select(func.count(Billet.id)))).scalar()

        print("Comptes GARDÉS :")
        for u in users_gardes:
            print(f"  - {u.fullname} <{u.email}> ({u.role})")
        for p in parts_gardes:
            print(f"  - {p.prenom} {p.nom} <{p.email}> (participant)")
        if not gardes:
            print("  (aucun compte personnel : ajoutez DEMO_COMPTES_PERSONNELS dans .env pour garder vos adresses)")
        print("\nSERA SUPPRIMÉ :")
        print(f"  - {nb_evenements} événements (avec tarifs, propositions, réactions, réservations) et {nb_billets} billets")
        print(f"  - {len(users_suppr)} comptes organisateur : " + ", ".join(u.email for u in users_suppr[:8]) + (" ..." if len(users_suppr) > 8 else ""))
        print(f"  - {len(parts) - len(parts_gardes)} comptes participant")
        print("  Le référentiel (lieux, artistes, types d'événement) et les comptes administrateurs sont conservés.")

        if not users_gardes or not any(u.role == "admin" for u in users_gardes):
            print("\nArrêt : aucun compte administrateur ne serait conservé.")
            return
        if not confirme:
            reponse = input("\nAction définitive. Avez-vous fait une sauvegarde ? Tapez OUI pour continuer : ")
            if reponse.strip() != "OUI":
                print("Annulé : rien n'a été supprimé.")
                return

        ids_parts_suppr = [p.id for p in parts if p not in parts_gardes] or [-1]
        ids_users_suppr = [u.id for u in users_suppr] or [-1]
        await db.execute(delete(InteractionPublique))
        await db.execute(delete(Notification))
        await db.execute(delete(Billet))
        await db.execute(delete(Paiement))
        await db.execute(delete(Reservation))
        await db.execute(delete(Recommandation))
        await db.execute(delete(Proposition))
        await db.execute(delete(CategorieBillet))
        await db.execute(delete(Evenement))
        await db.execute(delete(CodeEmail).where(CodeEmail.email.notin_(list(gardes) or [""])))
        await db.execute(delete(Participant).where(Participant.id.in_(ids_parts_suppr)))
        await db.execute(delete(User).where(User.id.in_(ids_users_suppr)))
        await db.commit()
        print("\nBase remise à zéro. Lancez maintenant : python -m scripts.donnees_demo")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remise à zéro avant la soutenance (garde les admins et vos comptes)")
    parser.add_argument("--oui", action="store_true", help="ne pas demander de confirmation")
    asyncio.run(principal(parser.parse_args().oui))
