"""lieux : région de Madagascar, et lieux de la Haute Matsiatra

Revision ID: f4a5b6c7d8e9
Revises: e3f4a5b6c7d8
Create Date: 2026-09-28 12:00:00.000000

- Ajoute la colonne lieux.region et la remplit d'après la ville pour les villes connues.
- Ajoute des lieux de Fianarantsoa (région Haute Matsiatra, où se trouve l'entreprise),
  relevés dans des sources publiques (royal-espace.com, madatsara.com, Petit Futé).
  Idempotent : un nom déjà présent (sans tenir compte de la casse) n'est pas réinséré.
- downgrade : retire la colonne ; les lieux ajoutés restent (ils ont pu servir à des événements).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f4a5b6c7d8e9"
down_revision: Union[str, Sequence[str], None] = "e3f4a5b6c7d8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# ville -> région (chefs-lieux et grandes villes)
REGIONS_PAR_VILLE = {
    "Antananarivo": "Analamanga",
    "Antsirabe": "Vakinankaratra",
    "Toamasina": "Atsinanana",
    "Mahajanga": "Boeny",
    "Antsiranana": "Diana",
    "Fianarantsoa": "Haute Matsiatra",
    "Ambalavao": "Haute Matsiatra",
    "Ambohimahasoa": "Haute Matsiatra",
    "Toliara": "Atsimo-Andrefana",
    "Tolagnaro": "Anosy",
    "Morondava": "Menabe",
    "Ambositra": "Amoron'i Mania",
    "Manakara": "Fitovinany",
    "Mananjary": "Vatovavy",
    "Sambava": "Sava",
    "Nosy Be": "Diana",
}

# (nom, adresse, ville, capacité connue ou None)
# (la liste complète, fournie par l'entreprise, est dans g5b6c7d8e9f0_lieux_fianarantsoa.py)
LIEUX_HAUTE_MATSIATRA = [
    ("L'Espace Royal Bateravola", "Bateravola", "Fianarantsoa", 700),
    ("Zomatel Hotel-Restaurant", None, "Fianarantsoa", None),
    ("La Chaudière", "Rue Pasteur Groult", "Fianarantsoa", None),
]


def upgrade() -> None:
    bind = op.get_bind()
    colonnes = {c["name"] for c in sa.inspect(bind).get_columns("lieux")}
    if "region" not in colonnes:
        op.add_column("lieux", sa.Column("region", sa.String(), nullable=True))

    for ville, region in REGIONS_PAR_VILLE.items():
        bind.execute(
            sa.text("UPDATE lieux SET region = CAST(:region AS VARCHAR) WHERE region IS NULL AND lower(ville) = lower(CAST(:ville AS VARCHAR))"),
            {"region": region, "ville": ville},
        )

    for nom, adresse, ville, capacite in LIEUX_HAUTE_MATSIATRA:
        bind.execute(
            sa.text(
                "INSERT INTO lieux (nom, adresse, ville, region, capacite) "
                "SELECT CAST(:nom AS VARCHAR), CAST(:adresse AS VARCHAR), CAST(:ville AS VARCHAR), "
                "CAST(:region AS VARCHAR), CAST(:capacite AS INTEGER) "
                "WHERE NOT EXISTS (SELECT 1 FROM lieux WHERE lower(nom) = lower(CAST(:nom AS VARCHAR)))"
            ),
            {"nom": nom, "adresse": adresse, "ville": ville, "region": "Haute Matsiatra", "capacite": capacite},
        )


def downgrade() -> None:
    op.drop_column("lieux", "region")
