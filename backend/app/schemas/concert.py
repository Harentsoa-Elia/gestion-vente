from pydantic import BaseModel, Field
from typing import Optional
class ConcertBase(BaseModel):
    title: str = Field(..., min_length=1, description="Title of the concert")
    description: str = Field(..., min_length=1, description="Description of the concert")
    price_vip: Optional[float] = Field(None, gt=0, description="Price of VIP tickets")
    price_adult: Optional[float] = Field(None, gt=0, description="Price of adult tickets")
    price_child: Optional[float] = Field(None, gt=0, description="Price of child tickets")
    code: str = Field(..., min_length=1, max_length=10, pattern="^[A-Z0-9]+$", description="Unique code for the concert")

class ConcertCreate(ConcertBase):
    pass

class ConcertResponse(ConcertBase):
    id: int = Field(..., description="Unique ID of the concert configuration")

    class Config:
        from_attributes = True