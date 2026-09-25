"""Création et vérification des codes à 6 chiffres envoyés par e-mail."""
import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

from decouple import config
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.code_email import CodeEmail

DUREE_VALIDITE = timedelta(minutes=15)
DELAI_RENVOI = timedelta(seconds=60)
TENTATIVES_MAX = 5

COMPTE_PARTICIPANT = "participant"
COMPTE_EQUIPE = "equipe"
USAGE_VERIFICATION = "verification"
USAGE_REINITIALISATION = "reinitialisation"


class RenvoiTropRapide(Exception):
    def __init__(self, secondes: int):
        super().__init__(f"Patientez {secondes} s avant de demander un nouveau code.")
        self.secondes = secondes


def _empreinte(email: str, code: str) -> str:
    # HMAC avec le secret JWT : une fuite de la table ne permet pas de retrouver les codes
    cle = str(config("secret")).encode()
    return hmac.new(cle, f"{email.lower()}:{code}".encode(), hashlib.sha256).hexdigest()


def _maintenant() -> datetime:
    return datetime.now(timezone.utc)


class CodeEmailService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def _dernier(self, email: str, compte: str, usage: str) -> Optional[CodeEmail]:
        result = await self.db.execute(
            select(CodeEmail)
            .where(CodeEmail.email == email.lower(), CodeEmail.compte == compte, CodeEmail.usage == usage)
            .order_by(CodeEmail.date_creation.desc(), CodeEmail.id.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def creer(self, email: str, compte: str, usage: str) -> str:
        """Crée un nouveau code (les précédents deviennent inutilisables) et le renvoie en clair."""
        dernier = await self._dernier(email, compte, usage)
        if dernier and dernier.date_creation:
            ecoule = _maintenant() - dernier.date_creation
            if ecoule < DELAI_RENVOI:
                raise RenvoiTropRapide(int((DELAI_RENVOI - ecoule).total_seconds()) + 1)

        await self.db.execute(
            update(CodeEmail)
            .where(CodeEmail.email == email.lower(), CodeEmail.compte == compte, CodeEmail.usage == usage, CodeEmail.utilise.is_(False))
            .values(utilise=True)
        )
        code = f"{secrets.randbelow(1_000_000):06d}"
        self.db.add(
            CodeEmail(
                email=email.lower(),
                compte=compte,
                usage=usage,
                empreinte=_empreinte(email, code),
                expire_le=_maintenant() + DUREE_VALIDITE,
                date_creation=_maintenant(),
            )
        )
        await self.db.commit()
        return code

    async def verifier(self, email: str, compte: str, usage: str, code: str) -> bool:
        """True si le code est le bon (il est alors consommé). Compte les essais ratés."""
        dernier = await self._dernier(email, compte, usage)
        if not dernier or dernier.utilise or dernier.expire_le < _maintenant() or dernier.tentatives >= TENTATIVES_MAX:
            return False
        code = (code or "").strip().replace(" ", "")
        if hmac.compare_digest(dernier.empreinte, _empreinte(email, code)):
            dernier.utilise = True
            await self.db.commit()
            return True
        dernier.tentatives += 1
        await self.db.commit()
        return False
