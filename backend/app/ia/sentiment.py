"""Module d'IA : analyse des sentiments des commentaires du public.

Le modèle (TF-IDF sur les mots et les morceaux de mots + régression logistique) est entraîné par ia/entrainer.py
et enregistré dans app/ia/modele_sentiment.joblib. Il est chargé une seule fois, au premier commentaire analysé,
puis gardé en mémoire : chaque prédiction prend quelques millisecondes, sans service externe.
"""
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Dict, Optional
import logging

FICHIER_MODELE = Path(__file__).resolve().parent / "modele_sentiment.joblib"
SENTIMENTS = ("positif", "neutre", "negatif")
LONGUEUR_MAX = 1000  # au-delà, le texte est tronqué avant l'analyse

journal = logging.getLogger(__name__)


@dataclass
class Analyse:
    sentiment: str            # positif, neutre ou negatif
    confiance: float          # probabilité de la classe retenue, entre 0 et 1
    probabilites: Dict[str, float]


@lru_cache(maxsize=1)
def modele():
    """Charge le modèle ; None s'il est absent (les commentaires restent alors à 0 point)."""
    if not FICHIER_MODELE.exists():
        journal.warning("Modèle de sentiment introuvable (%s) : lancez python ia/entrainer.py", FICHIER_MODELE)
        return None
    import joblib
    return joblib.load(FICHIER_MODELE)


def analyser(texte: Optional[str]) -> Optional[Analyse]:
    """Classe un commentaire en positif, neutre ou négatif. None si le texte est vide ou si le modèle manque."""
    texte = " ".join((texte or "").split())[:LONGUEUR_MAX]
    m = modele()
    if not texte or m is None:
        return None
    probas = m.predict_proba([texte])[0]
    par_classe = {str(c): round(float(p), 4) for c, p in zip(m.classes_, probas)}
    sentiment = max(par_classe, key=par_classe.get)
    return Analyse(sentiment=sentiment, confiance=par_classe[sentiment], probabilites=par_classe)
