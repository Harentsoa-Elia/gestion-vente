"""Sessions : jeton d'accès court + jeton de rafraîchissement (« refresh token ») avec rotation.

- À la connexion, le client reçoit un jeton d'accès (JWT, ACCESS_TOKEN_MINUTES, 15 min par défaut)
  et un jeton de rafraîchissement (aléatoire, REFRESH_TOKEN_JOURS, 7 jours par défaut).
- Quand le jeton d'accès arrive à expiration, le site appelle POST /auth/rafraichir : il reçoit
  une nouvelle paire et l'ancien jeton de rafraîchissement est marqué « utilisé » (rotation).
- Un jeton de rafraîchissement déjà utilisé qui revient (hors course entre deux onglets, tolérée
  quelques secondes) signale un vol : toutes les sessions du compte sont révoquées.
- Déconnexion, mot de passe changé ou compte suspendu : les jetons sont révoqués.
Seule l'empreinte SHA-256 des jetons de rafraîchissement est enregistrée.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from decouple import config
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.auth_handler import DUREE_ACCES_MINUTES, sign_jwt, sign_jwt_participant
from app.models.jeton_rafraichissement import JetonRafraichissement
from app.models.participant import Participant
from app.models.user import User

COMPTE_EQUIPE = "equipe"
COMPTE_PARTICIPANT = "participant"
DUREE_RAFRAICHISSEMENT_JOURS = config("REFRESH_TOKEN_JOURS", default=7, cast=int)
# deux onglets qui rafraîchissent en même temps : le second n'est pas pris pour un vol
TOLERANCE_COURSE = timedelta(seconds=30)


class SessionInvalide(Exception):
    """Jeton de rafraîchissement inconnu, expiré, révoqué ou compte suspendu : reconnexion."""


def _empreinte(jeton: str) -> str:
    return hashlib.sha256(jeton.encode()).hexdigest()


def _maintenant() -> datetime:
    return datetime.now(timezone.utc)


class SessionService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def ouvrir(self, compte: str, compte_id: int, email: str, role: Optional[str] = None,
                     famille: Optional[str] = None) -> dict:
        """Nouvelle paire de jetons (connexion, ou rotation si `famille` est donnée)."""
        jeton = secrets.token_urlsafe(48)
        self.db.add(
            JetonRafraichissement(
                compte=compte,
                compte_id=compte_id,
                empreinte=_empreinte(jeton),
                famille=famille or secrets.token_hex(16),
                expire_le=_maintenant() + timedelta(days=DUREE_RAFRAICHISSEMENT_JOURS),
            )
        )
        await self.db.commit()
        acces = (
            sign_jwt(email, compte_id, role) if compte == COMPTE_EQUIPE else sign_jwt_participant(email, compte_id)
        )["access_token"]
        return {
            "access_token": acces,
            "refresh_token": jeton,
            "token_type": "bearer",
            "expires_in": DUREE_ACCES_MINUTES * 60,
            "account_type": "staff" if compte == COMPTE_EQUIPE else "participant",
        }

    async def ouvrir_equipe(self, user: User) -> dict:
        return await self.ouvrir(COMPTE_EQUIPE, user.id, user.email, user.role)

    async def ouvrir_participant(self, participant: Participant) -> dict:
        return await self.ouvrir(COMPTE_PARTICIPANT, participant.id, participant.email)

    async def rafraichir(self, jeton: str) -> dict:
        ligne = (
            await self.db.execute(select(JetonRafraichissement).where(JetonRafraichissement.empreinte == _empreinte(jeton)))
        ).scalar_one_or_none()
        maintenant = _maintenant()
        if not ligne or ligne.revoque_le is not None or ligne.expire_le <= maintenant:
            raise SessionInvalide("Session expirée : reconnectez-vous.")
        if ligne.utilise_le is not None:
            if maintenant - ligne.utilise_le > TOLERANCE_COURSE:
                # réutilisation d'un ancien jeton : probablement volé, on coupe tout
                await self.revoquer_compte(ligne.compte, ligne.compte_id)
            raise SessionInvalide("Session expirée : reconnectez-vous.")

        # le compte existe-t-il encore, et n'est-il pas suspendu ? (rôle relu : il a pu changer)
        if ligne.compte == COMPTE_EQUIPE:
            compte = await self.db.get(User, ligne.compte_id)
            actif = compte is not None and compte.actif is not False
        else:
            compte = await self.db.get(Participant, ligne.compte_id)
            actif = compte is not None and (compte.statut or "actif") != "suspendu"
        if not actif:
            await self.revoquer_compte(ligne.compte, ligne.compte_id)
            raise SessionInvalide("Ce compte n'est plus accessible : reconnectez-vous.")

        ligne.utilise_le = maintenant
        return await self.ouvrir(
            ligne.compte, ligne.compte_id, compte.email, getattr(compte, "role", None), famille=ligne.famille
        )

    async def fermer(self, jeton: Optional[str]) -> None:
        """Déconnexion : révoque la session (toute la famille du jeton)."""
        if not jeton:
            return
        ligne = (
            await self.db.execute(select(JetonRafraichissement).where(JetonRafraichissement.empreinte == _empreinte(jeton)))
        ).scalar_one_or_none()
        if ligne:
            await self.db.execute(
                update(JetonRafraichissement)
                .where(JetonRafraichissement.famille == ligne.famille, JetonRafraichissement.revoque_le.is_(None))
                .values(revoque_le=_maintenant())
            )
            await self.db.commit()

    async def revoquer_compte(self, compte: str, compte_id: int) -> None:
        """Toutes les sessions du compte (vol, mot de passe changé, compte suspendu)."""
        await self.db.execute(
            update(JetonRafraichissement)
            .where(
                JetonRafraichissement.compte == compte,
                JetonRafraichissement.compte_id == compte_id,
                JetonRafraichissement.revoque_le.is_(None),
            )
            .values(revoque_le=_maintenant())
        )
        await self.db.commit()
