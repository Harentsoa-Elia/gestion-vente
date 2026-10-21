"""Tests unitaires du module d'IA (analyse des sentiments) et de la pondération des réactions."""
import pytest

from app.ia.sentiment import SENTIMENTS, analyser
from app.models.interaction_publique import InteractionType
from app.utils.scoring import SEUIL_CONFIANCE, poids


def test_texte_vide_non_analyse():
    assert analyser("") is None
    assert analyser("   ") is None
    assert analyser(None) is None


def test_resultat_bien_forme():
    a = analyser("Super concert, on viendra en famille !")
    assert a.sentiment in SENTIMENTS
    assert 0 <= a.confiance <= 1
    assert set(a.probabilites) == set(SENTIMENTS)
    assert abs(sum(a.probabilites.values()) - 1) < 1e-3
    assert a.confiance == max(a.probabilites.values())


@pytest.mark.parametrize("texte, attendu", [
    ("Magnifique choix, j'ai hâte d'y être", "positif"),
    ("Tsara be ity hetsika ity", "positif"),
    ("Les billets sont beaucoup trop chers", "negatif"),
    ("Lafo loatra ny tapakila", "negatif"),
    ("À quelle heure commence le concert ?", "neutre"),
    ("Aiza no hanaovana azy ?", "neutre"),
])
def test_exemples_francais_et_malgache(texte, attendu):
    assert analyser(texte).sentiment == attendu


def test_texte_tres_long_tronque():
    a = analyser("super " * 5000)
    assert a is not None and a.sentiment in SENTIMENTS


def test_poids_des_reactions():
    assert poids(InteractionType.LIKE) == 1
    assert poids(InteractionType.WAOUH) == 2
    assert poids(InteractionType.JADORE) == 3
    assert poids(InteractionType.FAVORI) == 2


def test_poids_des_commentaires_selon_sentiment_et_confiance():
    c = InteractionType.COMMENTAIRE
    assert poids(c, "positif", 0.9) == 2
    assert poids(c, "neutre", 0.9) == 0
    assert poids(c, "negatif", 0.9) == -2
    # le modèle hésite : le commentaire ne compte pas
    assert poids(c, "negatif", SEUIL_CONFIANCE - 0.01) == 0
    # commentaire non analysé (modèle absent)
    assert poids(c, None, None) == 0
