"""module d'IA : sentiment des commentaires (positif, neutre, negatif) et confiance du modèle

Ajoute les colonnes sentiment et confiance à interactions_publiques, puis analyse les commentaires déjà publiés
avec le modèle app/ia/modele_sentiment.joblib (s'il est présent).

Revision ID: q5f6a7b8c9d0
Revises: p4e5f6a7b8c9
Create Date: 2026-10-21 17:10:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "q5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "p4e5f6a7b8c9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    colonnes = {c["name"] for c in sa.inspect(bind).get_columns("interactions_publiques")}
    if "sentiment" not in colonnes:
        op.add_column("interactions_publiques", sa.Column("sentiment", sa.String(10), nullable=True))
    if "confiance" not in colonnes:
        op.add_column("interactions_publiques", sa.Column("confiance", sa.Float(), nullable=True))

    from app.ia.sentiment import analyser
    lignes = bind.execute(sa.text(
        "SELECT id, contenu FROM interactions_publiques WHERE type_interaction = 'COMMENTAIRE' AND sentiment IS NULL"
    )).all()
    for id_, contenu in lignes:
        a = analyser(contenu)
        if a:
            bind.execute(sa.text("UPDATE interactions_publiques SET sentiment = :s, confiance = :c WHERE id = :i"),
                         {"s": a.sentiment, "c": a.confiance, "i": id_})


def downgrade() -> None:
    op.drop_column("interactions_publiques", "confiance")
    op.drop_column("interactions_publiques", "sentiment")
