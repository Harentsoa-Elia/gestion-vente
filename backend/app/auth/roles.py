"""
Rôles des comptes de la table users (acteurs « Organisateur » et « Administrateur »
du diagramme de cas d'utilisation). Les participants ont leur propre table et leur
propre jeton (account_type = "participant") ; le visiteur n'a pas de compte.
Le rôle est porté par la colonne users.role et recopié dans le jeton.
"""
from typing import Optional

from fastapi import HTTPException

ROLE_ADMIN = "admin"
ROLE_ORGANISATEUR = "organisateur"
ROLES = (ROLE_ADMIN, ROLE_ORGANISATEUR)


def role_du_compte(auth_data: dict) -> Optional[str]:
    """Rôle d'un jeton staff décodé par JWTBearer ou FlexibleBearer (None pour un participant)."""
    if auth_data.get("account_type") == "participant":
        return None
    role = auth_data.get("role")
    return role if role in ROLES else None


def est_admin(auth_data: dict) -> bool:
    return role_du_compte(auth_data) == ROLE_ADMIN


def exiger_admin(auth_data: dict) -> None:
    if not est_admin(auth_data):
        raise HTTPException(status_code=403, detail="Réservé à l'administrateur.")
