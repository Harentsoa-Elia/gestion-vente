from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.models.artiste import Artiste
from app.schemas.artiste import ArtisteCreate


class ArtisteService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_artiste(self, artiste: ArtisteCreate) -> Artiste:
        db_artiste = Artiste(**artiste.dict())
        self.db.add(db_artiste)
        await self.db.commit()
        await self.db.refresh(db_artiste)
        return db_artiste

    async def get_artiste(self, artiste_id: int) -> Optional[Artiste]:
        result = await self.db.execute(select(Artiste).filter(Artiste.id == artiste_id))
        return result.scalar_one_or_none()

    async def get_all_artistes(self) -> List[Artiste]:
        result = await self.db.execute(select(Artiste))
        return result.scalars().all()

    async def update_artiste(self, artiste_id: int, artiste_update: ArtisteCreate) -> Optional[Artiste]:
        db_artiste = await self.get_artiste(artiste_id)
        if db_artiste:
            for key, value in artiste_update.dict(exclude_unset=True).items():
                setattr(db_artiste, key, value)
            await self.db.commit()
            await self.db.refresh(db_artiste)
        return db_artiste

    async def delete_artiste(self, artiste_id: int):
        db_artiste = await self.get_artiste(artiste_id)
        if db_artiste:
            await self.db.delete(db_artiste)
            await self.db.commit()