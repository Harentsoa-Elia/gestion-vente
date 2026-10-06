"""jetons de rafraîchissement : sessions longues avec jetons d'accès courts

Revision ID: n2c3d4e5f6a7
Revises: m1b2c3d4e5f6
Create Date: 2026-10-06 21:30:00.000000
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "n2c3d4e5f6a7"
down_revision: Union[str, Sequence[str], None] = "m1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "jetons_rafraichissement",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("compte", sa.String(length=20), nullable=False),
        sa.Column("compte_id", sa.Integer(), nullable=False),
        sa.Column("empreinte", sa.String(length=64), nullable=False),
        sa.Column("famille", sa.String(length=32), nullable=False),
        sa.Column("expire_le", sa.DateTime(timezone=True), nullable=False),
        sa.Column("date_creation", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("utilise_le", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoque_le", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_jetons_rafraichissement_id", "jetons_rafraichissement", ["id"])
    op.create_index("ix_jetons_rafraichissement_empreinte", "jetons_rafraichissement", ["empreinte"], unique=True)
    op.create_index("ix_jetons_rafraichissement_famille", "jetons_rafraichissement", ["famille"])
    op.create_index("ix_jetons_rafraichissement_compte", "jetons_rafraichissement", ["compte", "compte_id"])


def downgrade() -> None:
    op.drop_table("jetons_rafraichissement")
