from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.models.concert import Concert
from app.schemas.concert import ConcertCreate

class ConcertService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_concert(self, concert: ConcertCreate) -> Concert:
        """Creates a new concert configuration in the database."""
        db_concert = Concert(**concert.dict())
        self.db.add(db_concert)
        await self.db.commit()
        await self.db.refresh(db_concert)
        return db_concert

    async def get_concert(self, concert_id: int) -> Optional[Concert]:
        """Retrieves a single concert by its ID."""
        result = await self.db.execute(select(Concert).filter(Concert.id == concert_id))
        return result.scalar_one_or_none()

    async def get_concert_by_code(self, code: str) -> Optional[Concert]:
        """Retrieves a single concert by its unique code."""
        result = await self.db.execute(select(Concert).filter(Concert.code == code))
        return result.scalar_one_or_none()

    async def get_all_concerts(self) -> List[Concert]:
        """Retrieves all concert configurations from the database."""
        result = await self.db.execute(select(Concert))
        return result.scalars().all()

    async def update_concert(self, concert_id: int, concert_update: ConcertCreate) -> Optional[Concert]:
        """Updates an existing concert configuration."""
        db_concert = await self.get_concert(concert_id)
        if db_concert:
            for key, value in concert_update.dict(exclude_unset=True).items():
                setattr(db_concert, key, value)
            await self.db.commit()
            await self.db.refresh(db_concert)
        return db_concert
