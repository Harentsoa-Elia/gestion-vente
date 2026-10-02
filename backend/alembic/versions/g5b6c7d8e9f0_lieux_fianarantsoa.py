"""lieux de Fianarantsoa et de la Haute Matsiatra (liste fournie par l'entreprise)

Revision ID: g5b6c7d8e9f0
Revises: f4a5b6c7d8e9
Create Date: 2026-09-28 12:30:00.000000

- Renomme les lieux ajoutés par f4a5b6c7d8e9 avec les noms utilisés sur place.
- Retire 'Discothèque du Soafia' (seulement si aucun événement, proposition ou
  recommandation ne l'utilise).
- Ajoute les lieux de la liste ; idempotent (un nom déjà présent, sans tenir compte
  de la casse, n'est pas réinséré).
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g5b6c7d8e9f0"
down_revision: Union[str, Sequence[str], None] = "f4a5b6c7d8e9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

REGION = "Haute Matsiatra"

# ancien nom -> nom utilisé sur place
RENOMMAGES = {
    "Royal Espace Fianarantsoa": "L'Espace Royal Bateravola",
    "Hôtel Zomatel Fianarantsoa": "Zomatel Hotel-Restaurant",
    "La Chaud'hier": "La Chaudière",
}

A_RETIRER = ["Discothèque du Soafia"]

# (nom, adresse / quartier, ville)
LIEUX = [
    ("Zig Zag", None, "Fianarantsoa"),
    ("Espace Andry", None, "Fianarantsoa"),
    ("La Terrasse", None, "Fianarantsoa"),
    ("KSLMD", None, "Fianarantsoa"),
    ("Madarun", None, "Fianarantsoa"),
    ("Chez Didi", None, "Fianarantsoa"),
    ("Le Coliseum d'Ambatomena", "Ambatomena", "Fianarantsoa"),
    ("L'Espace Royal Bateravola", "Bateravola", "Fianarantsoa"),
    ("Alliance Française de Fianarantsoa", None, "Fianarantsoa"),
    ("Zomatel Hotel-Restaurant", None, "Fianarantsoa"),
    ("Villa Sylvestre - Tsara Guest House", None, "Fianarantsoa"),
    ("Hôtel Mahamanina", None, "Fianarantsoa"),
    ("Nick's Food & Drink", None, "Fianarantsoa"),
    ("La Table du Rova", None, "Fianarantsoa"),
    ("Stade de Fianarantsoa", "Ampasambazaha", "Fianarantsoa"),
    ("Espace Rojo Tsarasaotra", "Tsarasaotra", "Fianarantsoa"),
    ("Espace MyHary", "Quartier Ampopoka", "Fianarantsoa"),
    ("Espace La Villa Be Ny Antsa", None, "Alakamisy Ambohimaha"),
    ("Hôtel Tombontsoa", None, "Fianarantsoa"),
    ("La Rizière", None, "Fianarantsoa"),
    ("Résidence Matsiatra", None, "Fianarantsoa"),
    ("Le Lac Hôtel Sahambavy", None, "Sahambavy"),
    ("La Chaudière", "Rue Pasteur Groult", "Fianarantsoa"),
]


def upgrade() -> None:
    bind = op.get_bind()

    for ancien, nouveau in RENOMMAGES.items():
        # sans doublon : si le nouveau nom existe déjà, on laisse l'ancien tel quel
        bind.execute(
            sa.text(
                "UPDATE lieux SET nom = CAST(:nouveau AS VARCHAR) WHERE lower(nom) = lower(CAST(:ancien AS VARCHAR)) "
                "AND NOT EXISTS (SELECT 1 FROM lieux WHERE lower(nom) = lower(CAST(:nouveau AS VARCHAR)))"
            ),
            {"ancien": ancien, "nouveau": nouveau},
        )

    for nom in A_RETIRER:
        bind.execute(
            sa.text(
                "DELETE FROM lieux l WHERE lower(l.nom) = lower(CAST(:nom AS VARCHAR)) "
                "AND NOT EXISTS (SELECT 1 FROM evenements e WHERE e.lieu_id = l.id) "
                "AND NOT EXISTS (SELECT 1 FROM propositions p WHERE p.lieu_id = l.id) "
                "AND NOT EXISTS (SELECT 1 FROM recommandations r WHERE r.lieu_id = l.id)"
            ),
            {"nom": nom},
        )

    for nom, adresse, ville in LIEUX:
        bind.execute(
            sa.text(
                "INSERT INTO lieux (nom, adresse, ville, region) "
                "SELECT CAST(:nom AS VARCHAR), CAST(:adresse AS VARCHAR), CAST(:ville AS VARCHAR), CAST(:region AS VARCHAR) "
                "WHERE NOT EXISTS (SELECT 1 FROM lieux WHERE lower(nom) = lower(CAST(:nom AS VARCHAR)))"
            ),
            {"nom": nom, "adresse": adresse, "ville": ville, "region": REGION},
        )
    # lieux déjà présents de la liste (ex. Alliance Française) : on complète la région si elle manque
    bind.execute(
        sa.text("UPDATE lieux SET region = CAST(:region AS VARCHAR) WHERE region IS NULL AND lower(ville) IN ('fianarantsoa', 'sahambavy', 'alakamisy ambohimaha')"),
        {"region": REGION},
    )


def downgrade() -> None:
    # sans effet : ces lieux ont pu servir à des événements
    pass
