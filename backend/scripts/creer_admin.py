"""Crée le premier compte administrateur, ou nomme administrateur un compte de l'équipe existant.

Sur une base neuve (mise en production), aucun administrateur n'existe et l'inscription libre
ne crée que des organisateurs : ce script sert à créer le premier.

Utilisation (dans backend, venv activé, base configurée par .env) :
    python -m scripts.creer_admin
Le script demande l'adresse e-mail, le nom complet et le mot de passe (non affiché à la saisie).
"""
import asyncio
import getpass

from passlib.context import CryptContext
from sqlalchemy import func, select

from app.auth.roles import ROLE_ADMIN
from app.database import AsyncSessionLocal
from app.models.user import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def main() -> None:
    email = input("Adresse e-mail de l'administrateur : ").strip()
    if "@" not in email:
        print("Adresse e-mail invalide.")
        return
    async with AsyncSessionLocal() as db:
        user = (await db.execute(select(User).where(func.lower(User.email) == email.lower()))).scalar_one_or_none()
        if user is not None:
            user.role = ROLE_ADMIN
            user.actif = True
            await db.commit()
            print(f"{user.email} est maintenant administrateur.")
            return
        nom = input("Nom complet : ").strip()
        mdp = getpass.getpass("Mot de passe (au moins 8 caractères) : ")
        if len(nom) < 2 or len(mdp) < 8:
            print("Nom trop court ou mot de passe de moins de 8 caractères : rien n'a été créé.")
            return
        if mdp != getpass.getpass("Confirmez le mot de passe : "):
            print("Les deux mots de passe sont différents : rien n'a été créé.")
            return
        db.add(User(fullname=nom, email=email, password=pwd_context.hash(mdp), role=ROLE_ADMIN, actif=True))
        await db.commit()
        print(f"Compte administrateur créé : {email}")


if __name__ == "__main__":
    asyncio.run(main())
