# app/schemas/scan_history.py
from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional

class ScanHistoryCreate(BaseModel):
    ticket_id: str
    concert_id: int
    concert_title: Optional[str]
    category: Optional[str]
    is_valid: bool
    message: Optional[str]
    phone_brand: Optional[str]
    phone_model: Optional[str]
    ip_address: Optional[str]
    scanned_at: Optional[datetime] = Field(default_factory=datetime.utcnow)

class ScanHistoryResponse(ScanHistoryCreate):
    id: int
    user_id: int
    scanned_by: Optional[str] = None  # nom complet du user

    class Config:
        from_attributes = True

class ScanHistoryListResponse(BaseModel):
    ok: bool
    count: int
    data: List[ScanHistoryResponse]
