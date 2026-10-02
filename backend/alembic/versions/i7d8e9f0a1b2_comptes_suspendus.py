"""users : compte actif ou suspendu par l'administrateur

Revision ID: i7d8e9f0a1b2
Revises: h6c7d8e9f0a1
Create Date: 2026-09-28 13:30:00.000000

Les participants ont déjà une colonne statut ('actif' / 'suspendu').
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "i7d8e9f0a1b2"
down_revision: Union[str, Sequence[str], None] = "h6c7d8e9f0a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    colonnes = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("users")}
    if "actif" not in colonnes:
        op.add_column("users", sa.Column("actif", sa.Boolean(), nullable=False, server_default=sa.true()))


def downgrade() -> None:
    op.drop_column("users", "actif")
