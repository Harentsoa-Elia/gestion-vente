"""revendeurs : fiche par entreprise partenaire du dépôt-vente

Revision ID: m1b2c3d4e5f6
Revises: l0a1b2c3d4e5
Create Date: 2026-10-06 18:00:00.000000

Un revendeur appartient à un organisateur et peut recevoir autant de lots que nécessaire.
Les lots de dépôt-vente existants sont rattachés à un revendeur créé à partir de leur nom.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "m1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "l0a1b2c3d4e5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "revendeurs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("organisateur_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("nom", sa.String(length=120), nullable=False),
        sa.Column("contact", sa.String(length=120), nullable=True),
        sa.Column("date_creation", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("organisateur_id", "nom", name="uq_revendeurs_organisateur_nom"),
    )
    op.create_index("ix_revendeurs_id", "revendeurs", ["id"])
    op.create_index("ix_revendeurs_organisateur_id", "revendeurs", ["organisateur_id"])
    op.add_column("lots_hors_ligne", sa.Column("revendeur_id", sa.Integer(), sa.ForeignKey("revendeurs.id"), nullable=True))
    op.create_index("ix_lots_hors_ligne_revendeur_id", "lots_hors_ligne", ["revendeur_id"])

    # lots déjà créés : un revendeur par (organisateur, nom), avec le contact le plus récent
    op.execute(
        """
        INSERT INTO revendeurs (organisateur_id, nom, contact)
        SELECT DISTINCT ON (organisateur_id, left(trim(revendeur_nom), 120))
               organisateur_id, left(trim(revendeur_nom), 120), revendeur_contact
        FROM lots_hors_ligne
        WHERE type = 'depot' AND revendeur_nom IS NOT NULL AND trim(revendeur_nom) <> ''
        ORDER BY organisateur_id, left(trim(revendeur_nom), 120), date_creation DESC
        """
    )
    op.execute(
        """
        UPDATE lots_hors_ligne l SET revendeur_id = r.id
        FROM revendeurs r
        WHERE l.type = 'depot' AND r.organisateur_id = l.organisateur_id AND r.nom = left(trim(l.revendeur_nom), 120)
        """
    )


def downgrade() -> None:
    op.drop_index("ix_lots_hors_ligne_revendeur_id", table_name="lots_hors_ligne")
    op.drop_column("lots_hors_ligne", "revendeur_id")
    op.drop_table("revendeurs")
