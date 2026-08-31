from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from app.models.concert import Concert
from app.schemas.concert import ConcertCreate
from sqlalchemy import text
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
    

    async def delete_concert(self, concert_id: int):
        """Delete a concert and all related records."""

        # 1. Delete scan history
        await self.db.execute(
            text("DELETE FROM scan_history WHERE concert_id = :cid"),
            {"cid": concert_id}
        )

        # 2. Delete tickets
        await self.db.execute(
            text("DELETE FROM tickets WHERE concert_id = :cid"),
            {"cid": concert_id}
        )

        # 3. Delete users linked to the concert
        await self.db.execute(
            text("DELETE FROM users WHERE concert_id = :cid"),
            {"cid": concert_id}
        )

        # 4. Delete the concert itself
        await self.db.execute(
            text("DELETE FROM concerts WHERE id = :cid"),
            {"cid": concert_id}
        )

        await self.db.commit()