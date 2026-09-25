"""e-mail : adresse confirmée des participants et codes envoyés par e-mail

Revision ID: b8c9d0e1f2a3
Revises: a7b8c9d0e1f2
Create Date: 2026-09-25 16:00:00.000000

- participants.email_verifie : les comptes existants sont « non confirmés » ;
  leur propriétaire confirme son adresse avec un code avant sa prochaine réservation.
- codes_email : codes à 6 chiffres (confirmation d'adresse, mot de passe oublié),
  seule leur empreinte est enregistrée.
Sans effet sur ce qui existe déjà (base créée par create_all au démarrage).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b8c9d0e1f2a3"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    inspecteur = sa.inspect(op.get_bind())

    if "email_verifie" not in {c["name"] for c in inspecteur.get_columns("participants")}:
        op.add_column(
            "participants",
            sa.Column("email_verifie", sa.Boolean(), nullable=False, server_default=sa.false()),
        )

    if not inspecteur.has_table("codes_email"):
        op.create_table(
            "codes_email",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("email", sa.String(), nullable=False),
            sa.Column("compte", sa.String(20), nullable=False),
            sa.Column("usage", sa.String(20), nullable=False),
            sa.Column("empreinte", sa.String(64), nullable=False),
            sa.Column("tentatives", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("utilise", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("expire_le", sa.DateTime(timezone=True), nullable=False),
            sa.Column("date_creation", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_codes_email_id", "codes_email", ["id"])
        op.create_index("ix_codes_email_email", "codes_email", ["email"])


def downgrade() -> None:
    op.drop_index("ix_codes_email_email", table_name="codes_email")
    op.drop_index("ix_codes_email_id", table_name="codes_email")
    op.drop_table("codes_email")
    op.drop_column("participants", "email_verifie")
