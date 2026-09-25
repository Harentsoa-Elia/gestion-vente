from sqlalchemy import Boolean, Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class CodeEmail(Base):
    """Code à 6 chiffres envoyé par e-mail (confirmation d'adresse, mot de passe oublié).

    Seule l'empreinte du code est enregistrée (jamais le code lui-même).
    """

    __tablename__ = "codes_email"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, nullable=False, index=True)
    # « participant » ou « equipe » (organisateurs et administrateurs, table users)
    compte = Column(String(20), nullable=False)
    # « verification » ou « reinitialisation »
    usage = Column(String(20), nullable=False)
    empreinte = Column(String(64), nullable=False)
    tentatives = Column(Integer, nullable=False, default=0, server_default="0")
    utilise = Column(Boolean, nullable=False, default=False, server_default="false")
    expire_le = Column(DateTime(timezone=True), nullable=False)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
