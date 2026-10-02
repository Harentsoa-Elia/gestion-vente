from sqlalchemy import Boolean, CheckConstraint, Column, Integer, String
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    fullname = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    # « admin » ou « organisateur » (voir app/auth/roles.py)
    role = Column(String(20), nullable=False, server_default="organisateur", default="organisateur")
    # compte suspendu par l'administrateur : la connexion est refusée
    actif = Column(Boolean, nullable=False, server_default="true", default=True)

    __table_args__ = (
        CheckConstraint("role IN ('admin', 'organisateur')", name="ck_users_role_valeurs"),
    )

