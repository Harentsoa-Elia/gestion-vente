"""billets : heure du passage à l'entrée (contrôle des billets)

Revision ID: e3f4a5b6c7d8
Revises: d0e1f2a3b4c5
Create Date: 2026-09-27 16:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e3f4a5b6c7d8"
down_revision: Union[str, Sequence[str], None] = "d0e1f2a3b4c5"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # sans effet si la colonne existe déjà (base créée par create_all au démarrage)
    colonnes = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("billets")}
    if "date_scan" not in colonnes:
        op.add_column("billets", sa.Column("date_scan", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("billets", "date_scan")
