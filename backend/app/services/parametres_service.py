"""Réglages de la plateforme modifiables par l'administrateur (voir app/models/parametre_plateforme.py)."""
import os
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.parametre_plateforme import ParametresPlateforme

# valeur utilisée tant que l'administrateur n'a rien réglé (ou si la ligne n'existe pas encore)
FRAIS_PAR_DEFAUT = float(os.getenv("FRAIS_BILLET_HORS_LIGNE", "500"))
FRAIS_MAX = 10000.0


class ParametresService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def lire(self) -> ParametresPlateforme:
        ligne = await self.db.get(ParametresPlateforme, 1)
        if ligne is None:
            ligne = ParametresPlateforme(id=1, frais_billet_hors_ligne=FRAIS_PAR_DEFAUT)
            self.db.add(ligne)
            await self.db.commit()
            await self.db.refresh(ligne)
        return ligne

    async def frais_billet_hors_ligne(self) -> float:
        return float((await self.lire()).frais_billet_hors_ligne)

    async def modifier_frais(self, frais: float, admin_id: int | None) -> ParametresPlateforme:
        if frais < 0 or frais > FRAIS_MAX:
            raise ValueError(f"Le frais doit être compris entre 0 et {int(FRAIS_MAX)} Ar.")
        ligne = await self.lire()
        ligne.frais_billet_hors_ligne = round(float(frais), 2)
        ligne.date_modification = datetime.now(timezone.utc)
        ligne.modifie_par = admin_id
        await self.db.commit()
        await self.db.refresh(ligne)
        return ligne
