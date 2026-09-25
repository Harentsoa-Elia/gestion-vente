"""images : affiche des événements et visuel des propositions

Revision ID: a7b8c9d0e1f2
Revises: e2f3a4b5c6d7
Create Date: 2026-09-25 10:30:00.000000

Chemin relatif (/media/...) de l'image envoyée par l'organisateur ;
NULL tant qu'aucune image n'a été ajoutée (le site affiche alors une image de test).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "e2f3a4b5c6d7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


TABLES = ("evenements", "propositions")


def upgrade() -> None:
    # sans effet sur une table qui a déjà la colonne (base créée par create_all au démarrage)
    inspecteur = sa.inspect(op.get_bind())
    for table in TABLES:
        if "image_url" not in {c["name"] for c in inspecteur.get_columns(table)}:
            op.add_column(table, sa.Column("image_url", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("propositions", "image_url")
    op.drop_column("evenements", "image_url")
