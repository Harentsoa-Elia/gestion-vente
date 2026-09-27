"""événements : motif de rejet donné par l'administrateur

Revision ID: d0e1f2a3b4c5
Revises: c9d0e1f2a3b4
Create Date: 2026-09-27 14:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d0e1f2a3b4c5"
down_revision: Union[str, Sequence[str], None] = "c9d0e1f2a3b4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # sans effet si la colonne existe déjà (base créée par create_all au démarrage)
    colonnes = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("evenements")}
    if "motif_rejet" not in colonnes:
        op.add_column("evenements", sa.Column("motif_rejet", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("evenements", "motif_rejet")
