from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class UserSchema(BaseModel):
    fullname: str = Field(..., example="John Doe")
    email: EmailStr = Field(..., example="john@example.com")
    password: str = Field(..., example="password123")
    concert_id: Optional[int] = Field(None, example=1)

    class Config:
        from_attributes = True  # remplace orm_mode=True en Pydantic v2
        json_schema_extra = {
            "example": {
                "fullname": "John Doe",
                "email": "john@example.com",
                "password": "password123",
                "concert_id": 1
            }
        }


class UserLoginSchema(BaseModel):
    email: EmailStr = Field(..., example="john@example.com")
    password: str = Field(..., example="password123")

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "email": "john@example.com",
                "password": "password123"
            }
        }


# Schéma pour les mises à jour
class UserUpdateSchema(BaseModel):
    fullname: Optional[str] = Field(None, example="John Updated")
    email: Optional[EmailStr] = Field(None, example="newjohn@example.com")
    password: Optional[str] = Field(None, example="newpass123")
    concert_id: Optional[int] = Field(None, example=2)

    class Config:
        from_attributes = True
