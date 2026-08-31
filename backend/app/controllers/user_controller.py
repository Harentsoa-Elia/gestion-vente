from fastapi import APIRouter, Body, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from app.schemas.user import UserSchema, UserLoginSchema
from app.auth.auth_handler import sign_jwt
from app.models.user import User
from app.database import get_db
from app.auth.auth_bearer import BLACKLISTED_TOKENS
from app.auth.auth_bearer import JWTBearer
from fastapi.security import HTTPAuthorizationCredentials

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
        concert_id=user.concert_id,
    )
    db.add(db_user)
    await db.commit()
    return {"message": "User created successfully"}

    return sign_jwt(db_user.email, db_user.id, db_user.concert_id)

@router.post("/login", tags=["user"])
async def user_login(user: UserLoginSchema = Body(...), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user.email))
    db_user = result.scalar_one_or_none()
    
    if db_user:
        if verify_password(user.password, db_user.password):
            return sign_jwt(db_user.email, db_user.id, db_user.concert_id)
        else:
            raise HTTPException(status_code=403, detail="Wrong login details!")
    else:
        raise HTTPException(status_code=403, detail="Wrong login details!")

@router.post("/logout", tags=["user"])
async def logout(auth_data: dict = Depends(JWTBearer())):
    token = auth_data["token"]
    BLACKLISTED_TOKENS.add(token)
    return {"message": "Successfully logged out"}


@router.put("/users/{user_id}", tags=["user"])
async def update_user(
    user_id: int,
    user_data: UserSchema = Body(...),
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
):
    auth_user_id = auth_data["user_id"]

    # Récupérer l'utilisateur connecté
    result = await db.execute(select(User).where(User.id == auth_user_id))
    auth_user = result.scalar_one_or_none()

    if not auth_user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé (auth)")

    # 🔐 Vérification permissions
    # Si l'utilisateur connecté n'est PAS superadmin ET n'est PAS l'utilisateur qu'il modifie → FORBIDDEN
    if auth_user.concert_id != 0 and auth_user_id != user_id:
        raise HTTPException(status_code=403, detail="Accès interdit")

    # Récupérer l'utilisateur à modifier
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Mise à jour
    user.fullname = user_data.fullname or user.fullname
    user.email = user_data.email or user.email

    if user_data.concert_id is not None:
        user.concert_id = user_data.concert_id

    if user_data.password:
        user.password = hash_password(user_data.password)

    await db.commit()
    await db.refresh(user)

    return {
        "message": "Utilisateur mis à jour",
        "user": {
            "id": user.id,
            "fullname": user.fullname,
            "email": user.email,
            "concert_id": user.concert_id
        }
    }


@router.get("/users", tags=["user"])
async def list_users(auth_data: dict = Depends(JWTBearer()), db: AsyncSession = Depends(get_db)):
    user_id = auth_data["user_id"]
    result = await db.execute(select(User))
    users = result.scalars().all()

    return [
        {
            "id": u.id,
            "fullname": u.fullname,
            "email": u.email,
            "concert_id": u.concert_id
        }
        for u in users
    ]

@router.get("/users/{user_id}/concert", tags=["user"])
async def get_user_concert(user_id: int, auth_data: dict = Depends(JWTBearer()), db: AsyncSession = Depends(get_db)):
    user_id = auth_data["user_id"]
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    if user.concert_id is None:
        return {"message": "Aucun concert associé à cet utilisateur"}

    return {"user_id": user.id, "concert_id": user.concert_id}

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
        "concert_id": user.concert_id,
    }

@router.delete("/users/{user_id}", tags=["user"])
async def delete_user(
    user_id: int,
    auth_data: dict = Depends(JWTBearer()),
    db: AsyncSession = Depends(get_db)
):
    auth_user_id = auth_data["user_id"]

    # Récupérer l'utilisateur connecté
    result = await db.execute(select(User).where(User.id == auth_user_id))
    auth_user = result.scalar_one_or_none()

    if not auth_user:
        raise HTTPException(status_code=401, detail="Utilisateur non trouvé (auth)")

    # Permissions :
    if auth_user.concert_id != 0 and auth_user_id != user_id:
        raise HTTPException(status_code=403, detail="Accès interdit")

    # Récupérer l'utilisateur à supprimer
    result = await db.execute(select(User).where(User.id == user_id))
    user_to_delete = result.scalar_one_or_none()

    if not user_to_delete:
        raise HTTPException(status_code=404, detail="Utilisateur non trouvé")

    # Suppression
    await db.delete(user_to_delete)
    await db.commit()

    # Si l'utilisateur supprime son propre compte → blacklist du token
    if auth_user_id == user_id:
        token = auth_data["token"]
        BLACKLISTED_TOKENS.add(token)

    return {"message": "Utilisateur supprimé avec succès"}
