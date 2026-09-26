"""référentiel : retrait de quatre catégories d'événements

Revision ID: c9d0e1f2a3b4
Revises: b8c9d0e1f2a3
Create Date: 2026-09-26 11:40:00.000000

Retire « Rugby », « Course / Marathon », « Culte / Gospel » et « Événement pour enfants »
(ajoutées par e2f3a4b5c6d7). « Arts martiaux / Boxe » reste.
Une catégorie déjà utilisée (événement, proposition ou recommandation) est gardée,
pour ne perdre ni données ni votes : un message l'indique pendant la migration.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c9d0e1f2a3b4"
down_revision: Union[str, Sequence[str], None] = "b8c9d0e1f2a3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

A_RETIRER = [
    ("Rugby", "Match ou tournoi de rugby"),
    ("Course / Marathon", "Course à pied, marathon, trail"),
    ("Culte / Gospel", "Concert gospel, célébration religieuse"),
    ("Événement pour enfants", "Spectacle ou activité pour enfants"),
]

UTILISATIONS = (
    "SELECT (SELECT count(*) FROM evenements WHERE categorie_id = :id)"
    " + (SELECT count(*) FROM propositions WHERE categorie_id = :id)"
    " + (SELECT count(*) FROM recommandations WHERE categorie_id = :id)"
)


def upgrade() -> None:
    bind = op.get_bind()
    for nom, _ in A_RETIRER:
        ligne = bind.execute(
            sa.text("SELECT id FROM categories WHERE lower(nom) = lower(CAST(:nom AS VARCHAR))"), {"nom": nom}
        ).first()
        if ligne is None:
            continue
        if bind.execute(sa.text(UTILISATIONS), {"id": ligne.id}).scalar():
            print(f"  catégorie « {nom} » gardée : elle est déjà utilisée par un événement ou une proposition")
            continue
        bind.execute(sa.text("DELETE FROM categories WHERE id = :id"), {"id": ligne.id})


def downgrade() -> None:
    bind = op.get_bind()
    for nom, description in A_RETIRER:
        bind.execute(
            sa.text(
                "INSERT INTO categories (nom, description) "
                "SELECT CAST(:nom AS VARCHAR), CAST(:description AS VARCHAR) "
                "WHERE NOT EXISTS (SELECT 1 FROM categories WHERE lower(nom) = lower(CAST(:nom AS VARCHAR)))"
            ),
            {"nom": nom, "description": description},
        )
