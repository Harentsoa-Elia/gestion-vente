from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.sql import func

from app.database import Base


class JetonRafraichissement(Base):
    """Jeton de rafraîchissement (« refresh token ») d'une session.

    Le jeton d'accès (JWT) ne dure que quelques minutes ; ce jeton-ci, valable plusieurs jours,
    permet d'en obtenir un nouveau sans redemander le mot de passe. Seule son empreinte SHA-256
    est enregistrée. Chaque utilisation le remplace par un nouveau (rotation) : un jeton déjà
    remplacé qui revient est le signe d'un vol, et toutes les sessions du compte sont alors coupées.
    """

    __tablename__ = "jetons_rafraichissement"

    id = Column(Integer, primary_key=True, index=True)
    # « equipe » (table users : organisateurs, administrateurs) ou « participant »
    compte = Column(String(20), nullable=False)
    compte_id = Column(Integer, nullable=False)
    empreinte = Column(String(64), nullable=False, unique=True, index=True)
    # tous les jetons d'une même connexion partagent la même famille (rotation)
    famille = Column(String(32), nullable=False, index=True)
    expire_le = Column(DateTime(timezone=True), nullable=False)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    utilise_le = Column(DateTime(timezone=True), nullable=True)  # remplacé par un nouveau jeton
    revoque_le = Column(DateTime(timezone=True), nullable=True)  # déconnexion, vol, compte suspendu
