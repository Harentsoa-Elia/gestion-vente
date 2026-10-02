from pydantic import BaseModel, Field, EmailStr


class UserSchema(BaseModel):
    """Inscription d'un organisateur (POST /signup)."""
    fullname: str = Field(..., example="Fianar Events")
    email: EmailStr = Field(..., example="contact@fianar-events.mg")
    password: str = Field(..., example="motdepasse")

    class Config:
        from_attributes = True


class UserLoginSchema(BaseModel):
    email: EmailStr = Field(..., example="contact@fianar-events.mg")
    password: str = Field(..., example="motdepasse")

    class Config:
        from_attributes = True
