"""
Rôles des comptes de la table users (acteurs « Organisateur » et « Administrateur »
du diagramme de cas d'utilisation). Les participants ont leur propre table et leur
propre jeton (account_type = "participant") ; le visiteur n'a pas de compte.

Transition avec l'ancien module billetterie (concerts, tickets) :
concert_id = 0 y signifie « administrateur ». Pour que ce code continue de
fonctionner sans être réécrit, la base garantit l'équivalence
role = 'admin'  <=>  concert_id = 0   (contrainte ck_users_role_admin_concert).
"""
from typing import Optional

from fastapi import HTTPException

ROLE_ADMIN = "admin"
ROLE_ORGANISATEUR = "organisateur"
ROLES = (ROLE_ADMIN, ROLE_ORGANISATEUR)


def role_du_compte(auth_data: dict) -> Optional[str]:
    """Rôle d'un jeton staff décodé par JWTBearer. Les jetons émis avant l'ajout
    du champ role n'en ont pas : on le déduit alors de concert_id."""
    role = auth_data.get("role")
    if role in ROLES:
        return role
    if auth_data.get("user_id") is None:
        return None
    return ROLE_ADMIN if auth_data.get("concert_id") == 0 else ROLE_ORGANISATEUR


def est_admin(auth_data: dict) -> bool:
    return role_du_compte(auth_data) == ROLE_ADMIN


def exiger_admin(auth_data: dict) -> None:
    if not est_admin(auth_data):
        raise HTTPException(status_code=403, detail="Réservé à l'administrateur.")


def concert_id_pour_role(role: str, concert_id: Optional[int]) -> Optional[int]:
    """Applique l'équivalence admin <=> concert_id = 0."""
    if role == ROLE_ADMIN:
        return 0
    return None if concert_id == 0 else concert_id
