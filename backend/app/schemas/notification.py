from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class NotificationResponse(BaseModel):
    id: int
    message: str
    lu: bool
    date_creation: datetime
    reservation_id: Optional[int] = None

    class Config:
        from_attributes = True


class NotificationCountResponse(BaseModel):
    non_lues: int = Field(..., description="Nombre de notifications non lues")