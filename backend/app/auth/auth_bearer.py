from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.auth.auth_handler import decode_jwt
import asyncio
import time

BLACKLISTED_TOKENS = set()

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)
        if not credentials or credentials.scheme != "Bearer":
            raise HTTPException(status_code=403, detail="Invalid authentication scheme.")
        token = credentials.credentials
        if token in BLACKLISTED_TOKENS:
            raise HTTPException(status_code=403, detail="Token has been revoked.")
        payload = decode_jwt(token)
        if not payload:
            raise HTTPException(status_code=403, detail="Invalid or expired token.")
        return {
            "token": token,
            "user_id": payload.get("user_id"),
            "email": payload.get("email"),
            "concert_id": payload.get("concert_id"),
        }

    async def clean_blacklist():
        while True:
            await asyncio.sleep(600)
            global BLACKLISTED_TOKENS
            current_time = time.time()
            BLACKLISTED_TOKENS = {
                token for token in BLACKLISTED_TOKENS
                if decode_jwt(token).get("expires", 0) > current_time
            }
