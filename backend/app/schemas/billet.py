from pydantic import BaseModel, Field
from datetime import datetime


class BilletResponse(BaseModel):
    id: int = Field(..., description="Unique ID du billet")
    numero_billet: str
    qr_code: str
    is_used: bool
    date_emission: datetime
    reservation_id: int

    class Config:
        from_attributes = True