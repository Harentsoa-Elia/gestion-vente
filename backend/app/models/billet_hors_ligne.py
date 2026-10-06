"""Billets hors ligne : billets générés par l'organisateur et vendus ou offerts en dehors du site.

Un lot regroupe des billets d'un même tarif, générés en une fois :
- « depot »      : dépôt-vente chez une entreprise partenaire (revendeur). Les billets ne sont pas
                   payés au départ ; le revendeur rend l'argent des billets vendus et les invendus,
                   en principe une fois 80 % du lot vendu ;
- « guichet »    : billets que l'organisateur vend lui-même sur place ;
- « invitation » : billets offerts.

La plateforme facture l'organisateur à la génération : frais fixe par billet, payé par Mobile Money (simulé).
Chaque billet a son QR code chiffré et se contrôle à l'entrée comme un billet acheté en ligne ;
un billet rendu invendu est annulé et refusé à l'entrée.
"""
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base

TYPES_LOT = ("depot", "guichet", "invitation")


class Revendeur(Base):
    """Entreprise partenaire d'un organisateur pour le dépôt-vente : elle peut recevoir autant de lots que nécessaire."""

    __tablename__ = "revendeurs"
    __table_args__ = (UniqueConstraint("organisateur_id", "nom", name="uq_revendeurs_organisateur_nom"),)

    id = Column(Integer, primary_key=True, index=True)
    organisateur_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    nom = Column(String(120), nullable=False)
    contact = Column(String(120), nullable=True)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    lots = relationship("LotHorsLigne", back_populates="revendeur")


class LotHorsLigne(Base):
    __tablename__ = "lots_hors_ligne"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(20), nullable=False)
    evenement_id = Column(Integer, ForeignKey("evenements.id"), nullable=False, index=True)
    categorie_billet_id = Column(Integer, ForeignKey("categories_billet.id"), nullable=False)
    organisateur_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    # dépôt-vente : revendeur (nom et contact recopiés sur le lot, tels qu'au moment de la génération)
    revendeur_id = Column(Integer, ForeignKey("revendeurs.id"), nullable=True, index=True)
    revendeur_nom = Column(String, nullable=True)
    revendeur_contact = Column(String, nullable=True)
    quantite = Column(Integer, nullable=False)
    # prix d'un billet au moment de la génération (0 pour une invitation)
    prix_unitaire = Column(Float, nullable=False, default=0)
    # facturation de la plateforme
    frais_unitaire = Column(Float, nullable=False)
    montant_frais = Column(Float, nullable=False)
    mode_paiement_frais = Column(String(20), nullable=False)
    reference_paiement = Column(String(20), nullable=False)
    date_creation = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    # suivi du dépôt : billets vendus déclarés par le revendeur
    vendus_declares = Column(Integer, nullable=False, default=0, server_default="0")
    # en_cours -> regle (argent des vendus rendu, invendus annulés)
    statut = Column(String(20), nullable=False, default="en_cours", server_default="en_cours")
    date_reglement = Column(DateTime(timezone=True), nullable=True)
    montant_regle = Column(Float, nullable=True)

    billets = relationship("BilletHorsLigne", back_populates="lot", cascade="all, delete-orphan", order_by="BilletHorsLigne.id")
    revendeur = relationship("Revendeur", back_populates="lots")


class BilletHorsLigne(Base):
    __tablename__ = "billets_hors_ligne"

    id = Column(Integer, primary_key=True, index=True)
    lot_id = Column(Integer, ForeignKey("lots_hors_ligne.id", ondelete="CASCADE"), nullable=False, index=True)
    numero_billet = Column(String, unique=True, index=True, nullable=False)
    qr_code = Column(String, unique=True, nullable=False)
    is_used = Column(Boolean, default=False, nullable=False)
    date_scan = Column(DateTime(timezone=True), nullable=True)
    # rendu invendu au règlement : le QR code n'est plus accepté
    annule = Column(Boolean, default=False, nullable=False, server_default="false")
    date_annulation = Column(DateTime(timezone=True), nullable=True)

    lot = relationship("LotHorsLigne", back_populates="billets")
