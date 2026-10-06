from typing import Optional
from fastapi import APIRouter, Body, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.schemas.user import UserSchema, UserLoginSchema
from app.services.session_service import SessionService
from app.models.user import User
from app.database import get_db
from app.auth.auth_bearer import BLACKLISTED_TOKENS
from app.auth.auth_bearer import JWTBearer
from app.auth.roles import ROLE_ORGANISATEUR, exiger_admin

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

async def check_user(data: UserLoginSchema, db: AsyncSession):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    
    if user and verify_password(data.password, user.password):
        return True
    return False

@router.post("/signup", tags=["user"])
async def create_user(user: UserSchema = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    hashed_password = hash_password(user.password)
    db_user = User(
        fullname=user.fullname,
        email=user.email,
        password=hashed_password,
        # l'inscription libre ne crée que des organisateurs ; un admin est nommé par un admin
        role=ROLE_ORGANISATEUR,
    )
    db.add(db_user)
    await db.commit()
    return {"message": "User created successfully"}

@router.post("/login", tags=["user"])
async def user_login(user: UserLoginSchema = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalar_one_or_none()
    
    if db_user:
        if verify_password(user.password, db_user.password):
            if db_user.actif is False:
                raise HTTPException(status_code=423, detail="Ce compte est suspendu. Contactez l'administrateur de guichetweb.")
            # jeton d'accès court + jeton de rafraîchissement (session de plusieurs jours)
            return await SessionService(db).ouvrir_equipe(db_user)
        else:
            raise HTTPException(status_code=403, detail="Wrong login details!")
    else:
        raise HTTPException(status_code=403, detail="Wrong login details!")

@router.post("/logout", tags=["user"])
async def logout(
    auth_data: dict = Depends(JWTBearer()),
    refresh_token: Optional[str] = Body(None, embed=True),
    db: AsyncSession = Depends(get_db),
):
    BLACKLISTED_TOKENS.add(auth_data["token"])
    # la session (jeton de rafraîchissement) est fermée aussi
    await SessionService(db).fermer(refresh_token)
    return {"message": "Successfully logged out"}


@router.get("/users", tags=["user"])
async def list_users(auth_data: dict = Depends(JWTBearer()), db: AsyncSession = Depends(get_db)):
    # la liste des comptes (e-mails compris) est réservée à l'administrateur
    exiger_admin(auth_data)
    result = await db.execute(select(User))
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "fullname": u.fullname,
            "email": u.email,
            "role": u.role,
        }
        for u in users
    ]

@router.get("/users/me", tags=["user"])
async def get_me(auth_data: dict = Depends(JWTBearer()), db: AsyncSession = Depends(get_db)):
    user_id = auth_data["user_id"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "email": user.email,
        "fullname": user.fullname,
        "role": user.role,
    }
