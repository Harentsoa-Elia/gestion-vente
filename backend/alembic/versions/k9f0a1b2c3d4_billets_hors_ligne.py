"""billets hors ligne : dépôt-vente, guichet et invitations

Revision ID: k9f0a1b2c3d4
Revises: j8e9f0a1b2c3
Create Date: 2026-10-06 16:00:00.000000

L'organisateur génère des lots de billets vendus ou offerts en dehors du site
(dépôt-vente chez un revendeur, guichet, invitations). La plateforme facture
un frais fixe par billet généré.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k9f0a1b2c3d4"
down_revision: Union[str, Sequence[str], None] = "j8e9f0a1b2c3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "lots_hors_ligne",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.Column("evenement_id", sa.Integer(), sa.ForeignKey("evenements.id"), nullable=False),
        sa.Column("categorie_billet_id", sa.Integer(), sa.ForeignKey("categories_billet.id"), nullable=False),
        sa.Column("organisateur_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("revendeur_nom", sa.String(), nullable=True),
        sa.Column("revendeur_contact", sa.String(), nullable=True),
        sa.Column("quantite", sa.Integer(), nullable=False),
        sa.Column("prix_unitaire", sa.Float(), nullable=False, server_default="0"),
        sa.Column("frais_unitaire", sa.Float(), nullable=False),
        sa.Column("montant_frais", sa.Float(), nullable=False),
        sa.Column("mode_paiement_frais", sa.String(length=20), nullable=False),
        sa.Column("reference_paiement", sa.String(length=20), nullable=False),
        sa.Column("date_creation", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("vendus_declares", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("statut", sa.String(length=20), nullable=False, server_default="en_cours"),
        sa.Column("date_reglement", sa.DateTime(timezone=True), nullable=True),
        sa.Column("montant_regle", sa.Float(), nullable=True),
        sa.CheckConstraint("type IN ('depot', 'guichet', 'invitation')", name="ck_lots_hors_ligne_type"),
        sa.CheckConstraint("statut IN ('en_cours', 'regle')", name="ck_lots_hors_ligne_statut"),
        sa.CheckConstraint("quantite > 0", name="ck_lots_hors_ligne_quantite"),
    )
    op.create_index("ix_lots_hors_ligne_id", "lots_hors_ligne", ["id"])
    op.create_index("ix_lots_hors_ligne_evenement_id", "lots_hors_ligne", ["evenement_id"])
    op.create_index("ix_lots_hors_ligne_organisateur_id", "lots_hors_ligne", ["organisateur_id"])

    op.create_table(
        "billets_hors_ligne",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("lot_id", sa.Integer(), sa.ForeignKey("lots_hors_ligne.id", ondelete="CASCADE"), nullable=False),
        sa.Column("numero_billet", sa.String(), nullable=False),
        sa.Column("qr_code", sa.String(), nullable=False, unique=True),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("date_scan", sa.DateTime(timezone=True), nullable=True),
        sa.Column("annule", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("date_annulation", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_billets_hors_ligne_id", "billets_hors_ligne", ["id"])
    op.create_index("ix_billets_hors_ligne_lot_id", "billets_hors_ligne", ["lot_id"])
    op.create_index("ix_billets_hors_ligne_numero_billet", "billets_hors_ligne", ["numero_billet"], unique=True)


def downgrade() -> None:
    op.drop_table("billets_hors_ligne")
    op.drop_table("lots_hors_ligne")
