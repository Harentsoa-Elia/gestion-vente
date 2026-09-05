from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.models.lieu import Lieu
from app.schemas.lieu import LieuCreate


class LieuService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_lieu(self, lieu: LieuCreate) -> Lieu:
        db_lieu = Lieu(**lieu.dict())
        self.db.add(db_lieu)
        await self.db.commit()
        await self.db.refresh(db_lieu)
        return db_lieu

    async def get_lieu(self, lieu_id: int) -> Optional[Lieu]:
        result = await self.db.execute(select(Lieu).filter(Lieu.id == lieu_id))
        return result.scalar_one_or_none()

    async def get_all_lieux(self) -> List[Lieu]:
        result = await self.db.execute(select(Lieu))
        return result.scalars().all()

    async def update_lieu(self, lieu_id: int, lieu_update: LieuCreate) -> Optional[Lieu]:
        db_lieu = await self.get_lieu(lieu_id)
        if db_lieu:
            for key, value in lieu_update.dict(exclude_unset=True).items():
                setattr(db_lieu, key, value)
            await self.db.commit()
            await self.db.refresh(db_lieu)
        return db_lieu

    async def delete_lieu(self, lieu_id: int):
        db_lieu = await self.get_lieu(lieu_id)
        if db_lieu:
            await self.db.delete(db_lieu)
            await self.db.commit()