# app/utils/crypto.py
from cryptography.fernet import Fernet
import os

# Load encryption key (generate once and keep safe!)
SECRET_KEY = os.getenv("QR_SECRET_KEY", Fernet.generate_key().decode())
fernet = Fernet(SECRET_KEY.encode())

def encrypt_data(data: str) -> str:
    return fernet.encrypt(data.encode()).decode()

def decrypt_data(token: str) -> str:
    return fernet.decrypt(token.encode()).decode()
