"""propositions : relier les anciennes propositions à leur artiste, lieu ou catégorie

Revision ID: h6c7d8e9f0a1
Revises: g5b6c7d8e9f0
Create Date: 2026-09-28 12:45:00.000000

Des propositions créées avant le référentiel (ex. « Mahaleo ») n'ont pas d'artiste_id,
de lieu_id ou de categorie_id. On les relie à l'élément du même nom (sans tenir compte
de la casse) quand il existe ; sinon elles restent telles quelles (affichées avec leur libellé).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "h6c7d8e9f0a1"
down_revision: Union[str, Sequence[str], None] = "g5b6c7d8e9f0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

LIENS = [
    ("ARTISTE", "artiste_id", "artistes"),
    ("LIEU", "lieu_id", "lieux"),
    ("CATEGORIE", "categorie_id", "categories"),
]


def upgrade() -> None:
    bind = op.get_bind()
    for type_, colonne, table in LIENS:
        bind.execute(
            sa.text(
                f"UPDATE propositions p SET {colonne} = (SELECT MIN(t.id) FROM {table} t WHERE lower(t.nom) = lower(p.libelle)) "
                f"WHERE CAST(p.type AS TEXT) = :type AND p.{colonne} IS NULL "
                f"AND EXISTS (SELECT 1 FROM {table} t WHERE lower(t.nom) = lower(p.libelle))"
            ),
            {"type": type_},
        )


def downgrade() -> None:
    pass
