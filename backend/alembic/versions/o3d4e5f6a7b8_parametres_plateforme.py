"""paramètres de la plateforme : frais des billets hors ligne réglables par l'administrateur

Revision ID: o3d4e5f6a7b8
Revises: n2c3d4e5f6a7
Create Date: 2026-10-16 08:40:00.000000
"""
import os
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "o3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "n2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # l'API crée les tables manquantes à son démarrage : la table peut déjà exister
    if not sa.inspect(op.get_bind()).has_table("parametres_plateforme"):
        op.create_table(
        "parametres_plateforme",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("frais_billet_hors_ligne", sa.Float(), nullable=False, server_default="500"),
            sa.Column("date_modification", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("modifie_par", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        )
    # valeur de départ : celle du fichier .env si elle existait, sinon 500 Ar
    frais = float(os.getenv("FRAIS_BILLET_HORS_LIGNE", "500"))
    op.execute(
        sa.text("INSERT INTO parametres_plateforme (id, frais_billet_hors_ligne) VALUES (1, :f) ON CONFLICT (id) DO NOTHING").bindparams(f=frais)
    )


def downgrade() -> None:
    op.drop_table("parametres_plateforme")
