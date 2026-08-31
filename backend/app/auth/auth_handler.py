import time
from typing import Dict, Optional
import jwt
from decouple import config

JWT_SECRET = config("secret")
JWT_ALGORITHM = config("algorithm")

def token_response(token: str):
    return {"access_token": token}

def sign_jwt(email: str, user_id: int, concert_id: Optional[int] = None) -> Dict[str, str]:
    payload = {
        "email": email,
        "user_id": user_id,
        "concert_id": concert_id,
        "expires": time.time() + 86400  # 24h
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    return token_response(token)

# def decode_jwt(token: str) -> dict:
#     try:
#         decoded_token = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
#         return decoded_token if decoded_token["expires"] >= time.time() else None
#     except Exception:
#         return {}
def decode_jwt(token: str) -> dict:
    try:
        decoded_token = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if decoded_token["expires"] >= time.time():
            return decoded_token    
        return None  # Token expiré
    except Exception:
        return None  # Token invalide
