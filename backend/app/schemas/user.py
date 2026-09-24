from pydantic import BaseModel, Field, EmailStr
from typing import Literal, Optional

class UserSchema(BaseModel):
    fullname: str = Field(..., example="John Doe")
    email: EmailStr = Field(..., example="john@example.com")
    password: str = Field(..., example="password123")
    concert_id: Optional[int] = Field(None, example=None)
    # pris en compte uniquement quand c'est l'administrateur qui crée ou modifie le compte
    role: Optional[Literal["admin", "organisateur"]] = Field(None, example="organisateur")

    class Config:
        from_attributes = True  # remplace orm_mode=True en Pydantic v2
        json_schema_extra = {
            "example": {
                "fullname": "John Doe",
                "email": "john@example.com",
                "password": "password123",
                "concert_id": None,
                "role": "organisateur"
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
