from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer
from sqlalchemy.sql import func

from app.database import Base


class ParametresPlateforme(Base):
    """Réglages de la plateforme modifiables par l'administrateur (une seule ligne, id = 1).

    frais_billet_hors_ligne : frais facturés à l'organisateur pour chaque billet hors ligne généré
    (en ariary, 0 = génération gratuite). Chaque lot garde le frais en vigueur au moment de sa
    génération : changer le réglage ne modifie pas les lots déjà générés.
    """

    __tablename__ = "parametres_plateforme"

    id = Column(Integer, primary_key=True)
    frais_billet_hors_ligne = Column(Float, nullable=False, default=500, server_default="500")
    date_modification = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    modifie_par = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
