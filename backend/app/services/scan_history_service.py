# app/services/scan_history_service.py
from sqlalchemy import select
from app.models.scan_history import ScanHistory
from app.models.user import User
from app.schemas.scan_history import ScanHistoryResponse

class ScanHistoryService:
    def __init__(self, db):
        self.db = db

    async def create_table(self, engine, Base):
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all, tables=[ScanHistory.__table__])

    async def save_scan(self, user_id: int, user_concert_id: int, data, ip_address: str):
        if user_concert_id != 0 and user_concert_id != data.concert_id:
            raise PermissionError("Vous ne pouvez enregistrer que les scans de votre concert.")

        record = ScanHistory(
            user_id=user_id,
            ticket_id=data.ticket_id,
            concert_id=data.concert_id,
            concert_title=data.concert_title,
            category=data.category,
            is_valid=data.is_valid,
            message=data.message,
            phone_brand=data.phone_brand,
            phone_model=data.phone_model,
            ip_address=ip_address,
            scanned_at=data.scanned_at,
        )

        self.db.add(record)
        await self.db.commit()
        await self.db.refresh(record)
        return record

    async def list_by_concerts(self, concert_ids: list[int], user_concert_id: int, is_admin: bool):
        if not is_admin:
            if user_concert_id not in concert_ids:
                raise PermissionError("Accès refusé pour ces concerts.")
            concert_ids = [user_concert_id]

        # jointure entre scan_history et user
        result = await self.db.execute(
            select(
                ScanHistory,
                User.fullname.label("scanned_by")
            )
            .join(User, User.id == ScanHistory.user_id)
            .where(ScanHistory.concert_id.in_(concert_ids))
            .order_by(ScanHistory.scanned_at.desc())
        )

        rows = result.all()
        data = []
        for row in rows:
            scan, scanned_by = row
            item = ScanHistoryResponse.model_validate(scan, from_attributes=True)
            item.scanned_by = scanned_by
            data.append(item)

        return data
