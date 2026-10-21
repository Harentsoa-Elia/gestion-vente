# Module d'IA : analyse des sentiments des commentaires

Chaque commentaire publié sur une proposition est classé **positif**, **neutre** ou **négatif** par un modèle
d'apprentissage automatique. Un commentaire positif ajoute 2 points à la proposition, un négatif en retire 2 ;
sous 60 % de confiance, il ne compte pas.

| Fichier | Rôle |
|---|---|
| `ia/corpus.py` | Construit le corpus étiqueté (`ia/donnees/commentaires.csv`) et le test indépendant |
| `ia/entrainer.py` | Compare trois modèles, entraîne le meilleur, l'évalue et l'enregistre |
| `ia/rapport.json` | Résultats de l'évaluation (comparaison, matrice de confusion, erreurs) |
| `app/ia/sentiment.py` | Charge le modèle et classe un commentaire (utilisé par l'API) |
| `app/ia/modele_sentiment.joblib` | Modèle entraîné |

Réentraîner le modèle (depuis le dossier `backend`, environnement virtuel activé) :

```
python ia/corpus.py
python ia/entrainer.py
pytest
```
