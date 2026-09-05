from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.models.categorie import Categorie
from app.schemas.categorie import CategorieCreate


class CategorieService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_categorie(self, categorie: CategorieCreate) -> Categorie:
        db_categorie = Categorie(**categorie.dict())
        self.db.add(db_categorie)
        await self.db.commit()
        await self.db.refresh(db_categorie)
        return db_categorie

    async def get_categorie(self, categorie_id: int) -> Optional[Categorie]:
        result = await self.db.execute(select(Categorie).filter(Categorie.id == categorie_id))
        return result.scalar_one_or_none()

    async def get_all_categories(self) -> List[Categorie]:
        result = await self.db.execute(select(Categorie))
        return result.scalars().all()

    async def update_categorie(self, categorie_id: int, categorie_update: CategorieCreate) -> Optional[Categorie]:
        db_categorie = await self.get_categorie(categorie_id)
        if db_categorie:
            for key, value in categorie_update.dict(exclude_unset=True).items():
                setattr(db_categorie, key, value)
            await self.db.commit()
            await self.db.refresh(db_categorie)
        return db_categorie

    async def delete_categorie(self, categorie_id: int):
        db_categorie = await self.get_categorie(categorie_id)
        if db_categorie:
            await self.db.delete(db_categorie)
            await self.db.commit()