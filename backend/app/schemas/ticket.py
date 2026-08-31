from pydantic import BaseModel, Field, field_validator
from typing import List,Optional
from enum import Enum
from typing import Dict

class TicketCategory(str, Enum):
    VIP = "VIP"
    ADULT = "ADULT"
    CHILD = "CHILD"
    PREVENTE = "PREVENTE"
    VENTELIVE = "VENTELIVE"
    EMIFI_SANS_PRIX =  "EMIFI_SANS_PRIX"
    EMIFI_INV_50M_AR = "EMIFI_INV_50M_AR"
    EMIFI_INV_30M_AR = "EMIFI_INV_30M_AR"
    EMIFI_INV_10M_AR = "EMIFI_INV_10M_AR"
    EMIFI_INV_7M_AR =  "EMIFI_INV_7M_AR"
    EMIFI_ANCIENS = "EMIFI_ANCIENS"


class TicketBase(BaseModel):
    id: str = Field(..., description="Unique ID of the ticket (e.g., MDG123)")
    concert_id: int = Field(..., description="ID of the concert this ticket belongs to")
    is_used: bool = Field(False, description="Whether the ticket has been used (scanned) or not")
    qr_code_data: str = Field(..., description="Data encoded in the QR code, typically the ticket ID")
    category: TicketCategory = Field(..., description="Category of the ticket (VIP, ADULT, CHILD)")

class TicketResponse(TicketBase):
    class Config:
        from_attributes = True

class TicketGenerateRequest(BaseModel):
    concert_id: int = Field(..., description="ID of the concert for which to generate tickets")
    quantity: int = Field(..., gt=0, description="Number of tickets to generate")
    category: TicketCategory = Field(..., description="Category of tickets to generate")

class TicketScanRequest(BaseModel):
    """
    Charge utile côté mobile :
      - qr_code_data: valeur brute lue par le scanner (id chiffré/encodé)
      - selected_categories: catégories autorisées par l’agent (min 1, pas de scan sinon)
      - selected_concert_ids: optionnel; si fourni → on refuse un ticket d’un autre concert
    """
    qr_code_data: str = Field(..., min_length=1, description="QR content (e.g. encrypted ticket id)")
    selected_categories: List[TicketCategory] = Field(..., min_length=1, description="One or more allowed categories")
    selected_concert_ids: Optional[List[int]] = Field(
        default=None, description="Optional concert filter; if present, ticket must belong to one of these ids"
    )

    @field_validator("selected_concert_ids")
    @classmethod
    def _non_empty_if_present(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is not None and len(v) == 0:
            raise ValueError("selected_concert_ids must be omitted or contain at least 1 id")
        return v


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
    

class TicketCategoryCountResponse(BaseModel):
    categories: Dict[str, Dict[str, int]]

class Amount(BaseModel):
    total_amount: int = Field(..., description="Total of money made")
    amount_vip: int = Field(..., description="Total of money made")
    amount_couple: int = Field(..., description="Total of money made")
    amount_adult: int = Field(..., description="Total of money made")
    amount_child: int = Field(..., description="Total of money made")


class TicketRegenerateRequest(BaseModel):
    concert_id: int = Field(..., description="ID du concert")
    ticket_id_start: str = Field(..., description="ID du ticket de départ")
    ticket_id_end: Optional[str] = Field(None, description="ID du ticket de fin (optionnel si un seul ticket)")
    category: str = None  # 🆕 facultatif

class TicketWithTotalResponse(BaseModel):
    last_ticket_id: str | None
    total_tickets: int
    concert_id: int
    category: str
    

class TicketCategoryCreate(BaseModel):
    category: str