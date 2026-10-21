"""Évaluation du modèle sur le jeu de test indépendant : le test échoue si la performance baisse
(par exemple après un nouvel entraînement sur un corpus modifié)."""
import csv
from pathlib import Path

from sklearn.metrics import accuracy_score, f1_score

from app.ia.sentiment import analyser

TEST = Path(__file__).resolve().parent.parent / "ia" / "donnees" / "test_independant.csv"


def lire():
    with open(TEST, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def test_performance_minimale_sur_phrases_jamais_vues():
    lignes = lire()
    attendu = [l["sentiment"] for l in lignes]
    predit = [analyser(l["texte"]).sentiment for l in lignes]
    assert len(lignes) == 90
    assert accuracy_score(attendu, predit) >= 0.80
    assert f1_score(attendu, predit, average="macro") >= 0.80


def test_les_commentaires_surs_sont_plus_fiables():
    """Les commentaires au-dessus du seuil de confiance doivent être mieux classés que les autres."""
    from app.utils.scoring import SEUIL_CONFIANCE
    surs, incertains = [], []
    for l in lire():
        a = analyser(l["texte"])
        (surs if a.confiance >= SEUIL_CONFIANCE else incertains).append(a.sentiment == l["sentiment"])
    assert sum(surs) / len(surs) > sum(incertains) / max(1, len(incertains))
    assert sum(surs) / len(surs) >= 0.85
