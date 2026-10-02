"""retrait de l'ancien module concerts / tickets

Revision ID: j8e9f0a1b2c3
Revises: i7d8e9f0a1b2
Create Date: 2026-10-02 21:00:00.000000

L'ancien module (tables concerts, tickets, scan_history) a été remplacé par
evenements, categories_billet, reservations, billets et le contrôle des entrées.
Le rôle administrateur est désormais porté uniquement par users.role :
la colonne users.concert_id (admin = 0) et sa contrainte sont supprimées.

Ces tables avaient été créées hors Alembic (create_all) : elles sont supprimées
seulement si elles existent. Le retour en arrière recrée users.concert_id
mais pas les anciennes tables (restaurer une sauvegarde si besoin).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j8e9f0a1b2c3"
down_revision: Union[str, Sequence[str], None] = "i7d8e9f0a1b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("DROP TABLE IF EXISTS scan_history")
    op.execute("DROP TABLE IF EXISTS tickets")
    op.execute("DROP TABLE IF EXISTS concerts")
    op.execute("DROP TYPE IF EXISTS ticketcategory")

    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role_admin_concert")
    colonnes = {c["name"] for c in sa.inspect(op.get_bind()).get_columns("users")}
    if "concert_id" in colonnes:
        op.drop_column("users", "concert_id")


def downgrade() -> None:
    op.add_column("users", sa.Column("concert_id", sa.Integer(), nullable=True))
    op.execute("UPDATE users SET concert_id = 0 WHERE role = 'admin'")
    op.create_check_constraint(
        "ck_users_role_admin_concert",
        "users",
        "(role = 'admin') = (concert_id IS NOT DISTINCT FROM 0)",
    )
