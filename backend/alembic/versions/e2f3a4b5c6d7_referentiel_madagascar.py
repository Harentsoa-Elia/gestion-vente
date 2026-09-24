"""référentiel de départ : artistes, lieux et catégories d'événements à Madagascar

Revision ID: e2f3a4b5c6d7
Revises: d9e0f1a2b3c4
Create Date: 2026-09-24 22:30:00.000000

Données proposées aux organisateurs dans « Mes événements » (recherche des
propositions). Uniquement des noms vérifiés dans des sources publiques ; les
organisateurs peuvent ajouter les artistes et les lieux manquants depuis l'interface.

- Idempotent : un élément dont le nom existe déjà (sans tenir compte de la casse)
  n'est pas inséré une seconde fois, ni modifié.
- Capacités des lieux laissées vides quand elles ne sont pas connues avec certitude :
  l'administrateur les complète (PUT /lieux/{id}) pour affiner la participation estimée.
- downgrade sans effet : on ne peut pas distinguer ces lignes de celles saisies
  par les utilisateurs, et il ne faut pas risquer d'effacer leurs données.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e2f3a4b5c6d7"
down_revision: Union[str, Sequence[str], None] = "d9e0f1a2b3c4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# (nom, genre) — genre laissé vide quand il n'est pas établi
ARTISTES = [
    # salegy, musique du Nord
    ("Jaojoby", "Salegy"),
    ("Tence Mena", "Salegy"),
    ("Wawa", "Salegy"),
    ("Ninie Doniah", "Salegy"),
    ("Vaiavy Chila", None),
    # vakodrazana, valiha, musique traditionnelle
    ("Rossy", "Vakodrazana"),
    ("Rajery", "Valiha"),
    ("Justin Vali", "Valiha"),
    ("Kilema", "Marovany"),
    ("D'Gary", "Guitare, musique du Sud"),
    ("Fenoamby", "Musique traditionnelle"),
    ("Njava", "Musique traditionnelle"),
    ("Senge", "Musique traditionnelle"),
    ("Tarika Sammy", "Musique traditionnelle"),
    # folk, variétés
    ("Mahaleo", "Variétés"),
    ("Dama", "World, guitare"),
    ("Olombelo Ricky", "World, percussions"),
    ("Erick Manana", "Vakodrazana, variétés"),
    ("Lolo sy ny Tariny", "Variétés"),
    ("Mika sy Davis", "Variétés"),
    ("Samoëla", "Variétés"),
    ("Johary", "Variétés"),
    ("Mily Clément", "Variétés"),
    ("Poopy", "Variétés"),
    ("Ambondrona", "Variétés"),
    ("Bodo", "Variétés"),
    ("Njakatiana", "Variétés"),
    ("Denise", "Variétés"),
    ("Lalatiana", "Variétés"),
    ("Arione Joy", "Variétés"),
    ("Tsiliva", "Variétés"),
    ("Big MJ", "Variétés"),
    ("Black Nadia", "Variétés"),
    ("Théo Rakotovao", "Variétés"),
    ("Jerry Marcoss", "Variétés"),
    ("Mirado", "Variétés"),
    ("Melky", "Variétés"),
    ("Tizy Bone", "Variétés"),
    ("Majeur 7", "Variétés"),
    ("Tovo J'hay", "Variétés"),
    # jazz, blues
    ("Nicolas Vatomanga", "Jazz"),
    ("Silo Andrianandraina", "Jazz"),
    ("Joël Rabesolo", "Jazz"),
    ("Charles Kely", "World jazz"),
    ("Rija Rasolondraibe", "Jazz"),
    ("Jean Emilien", "Blues"),
    # scène urbaine et nouvelle génération
    ("Mage 4", "Rap"),
    ("Shyn", "R&B"),
    ("Da Hopp", None),
    ("Dadi Love", None),
    ("Wendy Cathalina", None),
    ("Lico Kininike", None),
    ("Ckycky", None),
    ("Elidiot", None),
    ("Annicette", None),
    ("Majesty", None),
    ("Douze X 16", None),
    ("A.L.G", None),
]

# (nom, ville, capacité connue ou None)
LIEUX = [
    ("Coliseum Antsonjombe", "Antananarivo", None),
    ("Palais des Sports de Mahamasina", "Antananarivo", None),
    ("Stade Makis Andohatapenaka", "Antananarivo", None),
    ("Centre de Conférences International d'Ivato", "Antananarivo", None),
    ("Institut Français de Madagascar", "Antananarivo", None),
    ("Cercle Germano-Malagasy", "Antananarivo", None),
    ("Alliance Française d'Antananarivo", "Antananarivo", None),
    ("Hôtel Carlton", "Antananarivo", None),
    ("Hôtel Colbert", "Antananarivo", None),
    ("Alliance Française d'Antsirabe", "Antsirabe", None),
    ("Stade Barikadimy", "Toamasina", None),
    ("Alliance Française de Toamasina", "Toamasina", None),
    ("Stade Rabemananjara", "Mahajanga", None),
    ("Alliance Française de Mahajanga", "Mahajanga", None),
    ("Alliance Française d'Antsiranana", "Antsiranana", None),
    ("Alliance Française de Fianarantsoa", "Fianarantsoa", None),
    ("Alliance Française de Toliara", "Toliara", None),
]

# (nom, description) : types d'événements
CATEGORIES = [
    ("Concert", "Concert, récital, tournée"),
    ("Festival", "Festival de musique ou pluridisciplinaire"),
    ("Cabaret", "Soirée cabaret, dîner-spectacle"),
    ("Hira gasy", "Spectacle traditionnel de hira gasy"),
    ("Spectacle traditionnel", "Danses et musiques traditionnelles"),
    ("Danse", "Spectacle ou battle de danse"),
    ("Théâtre", "Pièce de théâtre"),
    ("Humour / Stand-up", "Spectacle d'humour"),
    ("Soirée / Clubbing", "Soirée dansante, DJ set"),
    ("Karaoké", "Soirée karaoké"),
    ("Gala", "Soirée de gala"),
    ("Défilé de mode", "Défilé, fashion show"),
    ("Cinéma / Projection", "Projection de film, ciné-club"),
    ("Exposition", "Exposition d'art, de photographie"),
    ("Salon / Foire", "Salon professionnel, foire, kermesse"),
    ("Conférence", "Conférence, table ronde"),
    ("Séminaire / Formation", "Séminaire, atelier, formation"),
    ("Rencontre professionnelle", "Networking, rencontre d'affaires"),
    ("Lancement de produit", "Lancement de marque ou de produit"),
    ("Football", "Match ou tournoi de football"),
    ("Basketball", "Match ou tournoi de basketball"),
    ("Rugby", "Match ou tournoi de rugby"),
    ("Arts martiaux / Boxe", "Combat, gala de boxe ou d'arts martiaux"),
    ("Course / Marathon", "Course à pied, marathon, trail"),
    ("E-sport / Jeux vidéo", "Tournoi de jeux vidéo"),
    ("Culte / Gospel", "Concert gospel, célébration religieuse"),
    ("Événement caritatif", "Concert ou soirée de solidarité"),
    ("Événement pour enfants", "Spectacle ou activité pour enfants"),
    ("Gastronomie / Dégustation", "Dégustation, festival culinaire"),
    ("Excursion / Randonnée", "Sortie, excursion, randonnée"),
]


def upgrade() -> None:
    bind = op.get_bind()
    # Types explicites (CAST) : asyncpg refuse un paramètre utilisé deux fois
    # si PostgreSQL en déduit deux types différents (text et varchar).

    for nom, genre in ARTISTES:
        bind.execute(
            sa.text(
                "INSERT INTO artistes (nom, genre_artistique) "
                "SELECT CAST(:nom AS VARCHAR), CAST(:genre AS VARCHAR) "
                "WHERE NOT EXISTS (SELECT 1 FROM artistes WHERE lower(nom) = lower(CAST(:nom AS VARCHAR)))"
            ),
            {"nom": nom, "genre": genre},
        )

    for nom, ville, capacite in LIEUX:
        bind.execute(
            sa.text(
                "INSERT INTO lieux (nom, ville, capacite) "
                "SELECT CAST(:nom AS VARCHAR), CAST(:ville AS VARCHAR), CAST(:capacite AS INTEGER) "
                "WHERE NOT EXISTS (SELECT 1 FROM lieux WHERE lower(nom) = lower(CAST(:nom AS VARCHAR)))"
            ),
            {"nom": nom, "ville": ville, "capacite": capacite},
        )

    for nom, description in CATEGORIES:
        bind.execute(
            sa.text(
                "INSERT INTO categories (nom, description) "
                "SELECT CAST(:nom AS VARCHAR), CAST(:description AS VARCHAR) "
                "WHERE NOT EXISTS (SELECT 1 FROM categories WHERE lower(nom) = lower(CAST(:nom AS VARCHAR)))"
            ),
            {"nom": nom, "description": description},
        )


def downgrade() -> None:
    # Volontairement sans effet : un nom inséré ici peut aussi avoir été saisi par un
    # utilisateur avant la migration (ex. « Mahaleo »), et rien ne permet de distinguer
    # les deux. Supprimer ces lignes risquerait d'effacer des données réelles.
    pass
