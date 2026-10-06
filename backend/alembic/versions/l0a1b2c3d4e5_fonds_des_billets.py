"""fonds d'image des billets : par tarif et par type d'événement

Revision ID: l0a1b2c3d4e5
Revises: k9f0a1b2c3d4
Create Date: 2026-10-06 17:00:00.000000

Le billet PDF prend le fond de son tarif (choisi par l'organisateur), sinon celui
du type d'événement (choisi par l'administrateur), sinon le design guichetweb.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "l0a1b2c3d4e5"
down_revision: Union[str, Sequence[str], None] = "k9f0a1b2c3d4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("categories_billet", sa.Column("fond_url", sa.String(), nullable=True))
    op.add_column("categories", sa.Column("fond_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("categories", "fond_url")
    op.drop_column("categories_billet", "fond_url")
