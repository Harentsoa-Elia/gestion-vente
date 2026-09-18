from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional

from app.models.categorie_billet import CategorieBillet
from app.schemas.categorie_billet import CategorieBilletCreate, CategorieBilletUpdate


class CategorieBilletService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_categorie(self, data: CategorieBilletCreate) -> CategorieBillet:
        db_categorie = CategorieBillet(**data.dict())
        self.db.add(db_categorie)
        await self.db.commit()
        await self.db.refresh(db_categorie)
        return db_categorie

    async def get_categorie(self, categorie_id: int) -> Optional[CategorieBillet]:
        result = await self.db.execute(
            select(CategorieBillet).filter(CategorieBillet.id == categorie_id)
        )
        return result.scalar_one_or_none()

    async def get_categories_by_evenement(self, evenement_id: int) -> List[CategorieBillet]:
        result = await self.db.execute(
            select(CategorieBillet).filter(CategorieBillet.evenement_id == evenement_id)
        )
        return result.scalars().all()

    async def update_categorie(self, categorie_id: int, data: CategorieBilletUpdate) -> Optional[CategorieBillet]:
        db_categorie = await self.get_categorie(categorie_id)
        if not db_categorie:
            return None
        for key, value in data.dict(exclude_unset=True).items():
            setattr(db_categorie, key, value)
        await self.db.commit()
        await self.db.refresh(db_categorie)
        return db_categorie

    async def delete_categorie(self, categorie_id: int):
        db_categorie = await self.get_categorie(categorie_id)
        if db_categorie:
            await self.db.delete(db_categorie)
            await self.db.commit()

    async def get_prix_minimum(self, evenement_id: int) -> Optional[float]:
        categories = await self.get_categories_by_evenement(evenement_id)
        if not categories:
            return None
        return min(c.prix for c in categories)