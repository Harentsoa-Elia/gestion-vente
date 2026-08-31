from pydantic import BaseModel, Field
from typing import List
from enum import Enum

class TicketCategory(str, Enum):
    VIP = "VIP"
    ADULT = "ADULT"
    CHILD = "CHILD"

class TicketBase(BaseModel):
    id: str = Field(..., description="Unique ID of the ticket (e.g., MDG123)")
    concert_id: int = Field(..., description="ID of the concert this ticket belongs to")
    is_used: bool = Field(False, description="Whether the ticket has been used (scanned) or not")
    qr_code_data: str = Field(..., description="Data encoded in the QR code, typically the ticket ID")
    category: TicketCategory = Field(..., description="Category of the ticket (VIP, ADULT, CHILD)")

class TicketResponse(TicketBase):
    class Config:
        orm_mode = True

class TicketGenerateRequest(BaseModel):
    concert_id: int = Field(..., description="ID of the concert for which to generate tickets")
    quantity: int = Field(..., gt=0, description="Number of tickets to generate")
    category: TicketCategory = Field(..., description="Category of tickets to generate")

class TicketScanRequest(BaseModel):
    qr_code_data: str = Field(..., description="The data read from the QR code (expected to be a ticket ID)")

class TicketScanResponse(BaseModel):
    ticket_id: str = Field(..., description="The ID of the scanned ticket")
    is_valid: bool = Field(..., description="True if the ticket is valid and unused, False otherwise")
    message: str = Field(..., description="A message explaining the scan result")
    concert_title: str = Field(..., description="Title of the concert associated with the ticket")
    concert_description: str = Field(..., description="Description of the concert associated with the ticket")
    
class TicketCountResponse(BaseModel):
    total: int = Field(..., description="Total number of tickets")
    used: int = Field(..., description="Number of used tickets")
    unused: int = Field(..., description="Number of unused tickets")
