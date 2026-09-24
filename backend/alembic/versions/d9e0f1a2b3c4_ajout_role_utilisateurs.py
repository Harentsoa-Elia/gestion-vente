"""ajout du rôle des utilisateurs (admin, organisateur)

Revision ID: d9e0f1a2b3c4
Revises: b7c8d9e0f1a2
Create Date: 2026-09-24 14:00:00.000000

Les acteurs « Organisateur » et « Administrateur » du diagramme de cas d'utilisation
partagent la table users ; ce champ les distingue. Les participants ont leur table.

Règles de reprise des comptes existants :
- concert_id = 0 (ancien « superadmin ») -> admin
- tous les autres comptes             -> organisateur

La migration est écrite pour fonctionner aussi si une colonne « role » a déjà été
ajoutée à la main ou par une migration d'essai : la colonne est alors convertie.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d9e0f1a2b3c4"
down_revision: Union[str, Sequence[str], None] = "b7c8d9e0f1a2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    colonnes = {c["name"] for c in sa.inspect(bind).get_columns("users")}

    if "role" in colonnes:
        # colonne d'essai déjà présente : on la ramène au format attendu
        op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
        op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(20) USING lower(role::text)")
    else:
        op.add_column("users", sa.Column("role", sa.String(length=20), nullable=True))

    # reprise des comptes existants
    op.execute("UPDATE users SET role = CASE WHEN concert_id = 0 THEN 'admin' ELSE 'organisateur' END")

    op.alter_column("users", "role", nullable=False, server_default="organisateur")

    # contraintes (supprimées d'abord si une version d'essai existait)
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role_valeurs")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role_admin_concert")
    op.create_check_constraint("ck_users_role_valeurs", "users", "role IN ('admin', 'organisateur')")
    # transition : l'ancien module billetterie reconnaît l'admin à concert_id = 0
    op.create_check_constraint(
        "ck_users_role_admin_concert",
        "users",
        "(role = 'admin') = (concert_id IS NOT DISTINCT FROM 0)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_users_role_admin_concert", "users", type_="check")
    op.drop_constraint("ck_users_role_valeurs", "users", type_="check")
    op.drop_column("users", "role")
