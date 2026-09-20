from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, update
from typing import List

from app.models.notification import Notification


class NotificationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_notifications(self, organisateur_id: int, limit: int = 20) -> List[Notification]:
        result = await self.db.execute(
            select(Notification)
            .filter(Notification.organisateur_id == organisateur_id)
            .order_by(Notification.date_creation.desc())
            .limit(limit)
        )
        return result.scalars().all()

    async def count_non_lues(self, organisateur_id: int) -> int:
        result = await self.db.execute(
            select(func.count(Notification.id)).filter(
                Notification.organisateur_id == organisateur_id,
                Notification.lu == False,  # noqa: E712
            )
        )
        return result.scalar_one()

    async def marquer_comme_lues(self, organisateur_id: int) -> int:
        result = await self.db.execute(
            update(Notification)
            .where(Notification.organisateur_id == organisateur_id, Notification.lu == False)  # noqa: E712
            .values(lu=True)
        )
        await self.db.commit()
        return result.rowcount