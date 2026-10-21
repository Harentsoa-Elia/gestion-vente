"""Entraînement du modèle d'analyse des sentiments des commentaires.

1. compare trois modèles par validation croisée (5 plis) sur le corpus d'entraînement ;
2. entraîne le meilleur sur tout le corpus ;
3. l'évalue sur le jeu de test indépendant (phrases jamais vues) ;
4. enregistre le modèle (app/ia/modele_sentiment.joblib) et le rapport d'évaluation (ia/rapport.json).

Lancement : python ia/entrainer.py  (depuis le dossier backend, environnement virtuel activé)
"""
import csv
import json
import time
from pathlib import Path

import joblib
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedGroupKFold, cross_validate
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import FeatureUnion, Pipeline
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.svm import LinearSVC

ICI = Path(__file__).resolve().parent
DONNEES = ICI / "donnees"
MODELE = ICI.parent / "app" / "ia" / "modele_sentiment.joblib"
RAPPORT = ICI / "rapport.json"
INFOS = ICI.parent / "app" / "ia" / "modele_infos.json"  # résumé lu par l'API (nom du modèle, performance)
CLASSES = ["negatif", "neutre", "positif"]
SEUIL = 0.6  # même valeur que SEUIL_CONFIANCE dans app/utils/scoring.py


def lire(nom):
    with open(DONNEES / nom, encoding="utf-8") as f:
        lignes = list(csv.DictReader(f))
    return [l["texte"] for l in lignes], [l["sentiment"] for l in lignes], [l.get("modele") for l in lignes]


def representation():
    """Mots et suites de caractères : les mots servent pour le français, les morceaux de mots pour le malgache
    et les fautes de frappe ("tres" / "très")."""
    return FeatureUnion([
        ("mots", TfidfVectorizer(lowercase=True, strip_accents="unicode", ngram_range=(1, 2), sublinear_tf=True)),
        ("caracteres", TfidfVectorizer(lowercase=True, strip_accents="unicode", analyzer="char_wb", ngram_range=(2, 5),
                                       sublinear_tf=True, min_df=2)),
    ])


CANDIDATS = {
    "Naive Bayes multinomial": MultinomialNB(alpha=0.3),
    "Régression logistique": LogisticRegression(C=10, max_iter=2000),
    "SVM linéaire": LinearSVC(C=1.0),
}


def main():
    x, y, groupes = lire("commentaires.csv")
    x_test, y_test, _ = lire("test_independant.csv")
    # les variantes d'un même modèle de phrase restent dans le même pli : la validation ne voit que des phrases
    # construites sur des modèles absents de l'entraînement
    plis = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=2026)

    comparaison = {}
    print(f"Corpus d'entraînement : {len(x)} commentaires ; test indépendant : {len(x_test)}\n")
    print(f"{'Modèle':<26}{'Exactitude (VC)':>17}{'F1 macro (VC)':>15}{'F1 test indép.':>16}{'Durée':>9}")
    for nom, clf in CANDIDATS.items():
        debut = time.perf_counter()
        pipe = Pipeline([("texte", representation()), ("clf", clf)])
        vc = cross_validate(pipe, x, y, groups=groupes, cv=plis, scoring=["accuracy", "f1_macro"])
        pipe.fit(x, y)
        f1_test = f1_score(y_test, pipe.predict(x_test), average="macro")
        duree = time.perf_counter() - debut
        comparaison[nom] = {"exactitude_vc": round(vc["test_accuracy"].mean(), 4), "f1_vc": round(vc["test_f1_macro"].mean(), 4),
                            "f1_test": round(f1_test, 4), "duree_s": round(duree, 1)}
        c = comparaison[nom]
        print(f"{nom:<26}{c['exactitude_vc']:>17.3f}{c['f1_vc']:>15.3f}{c['f1_test']:>16.3f}{duree:>8.1f}s")

    # choix sur la validation croisée seulement : le test indépendant ne sert qu'à mesurer, jamais à choisir
    choisi = max(comparaison, key=lambda n: comparaison[n]["f1_vc"])
    clf = CANDIDATS[choisi]
    if isinstance(clf, LinearSVC):  # le SVM ne donne pas de probabilité : on le calibre pour obtenir une confiance
        clf = CalibratedClassifierCV(LinearSVC(C=1.0), cv=5)
    modele = Pipeline([("texte", representation()), ("clf", clf)])
    modele.fit(x, y)

    pred = modele.predict(x_test)
    debut = time.perf_counter()
    for t in x_test:
        modele.predict([t])
    ms = (time.perf_counter() - debut) / len(x_test) * 1000
    rapport = classification_report(y_test, pred, labels=CLASSES, output_dict=True, zero_division=0)
    matrice = confusion_matrix(y_test, pred, labels=CLASSES).tolist()
    erreurs = [{"texte": t, "attendu": a, "predit": p} for t, a, p in zip(x_test, y_test, pred) if a != p]

    print(f"\nModèle retenu : {choisi}")
    print(f"Test indépendant : exactitude {accuracy_score(y_test, pred):.3f}, F1 macro {f1_score(y_test, pred, average='macro'):.3f}")
    print(f"{'Classe':<10}{'Précision':>11}{'Rappel':>9}{'F1':>8}{'Effectif':>10}")
    for c in CLASSES:
        r = rapport[c]
        print(f"{c:<10}{r['precision']:>11.3f}{r['recall']:>9.3f}{r['f1-score']:>8.3f}{int(r['support']):>10}")
    print("Matrice de confusion (lignes : attendu, colonnes : prédit)", CLASSES)
    for c, ligne in zip(CLASSES, matrice):
        print(f"  {c:<8}", ligne)
    print(f"Temps moyen de prédiction : {ms:.2f} ms par commentaire")

    # seuil de confiance : sous 0,6, le commentaire est gardé mais ne compte pas dans la recommandation
    confiances = modele.predict_proba(x_test).max(axis=1)
    surs = [i for i, c in enumerate(confiances) if c >= SEUIL]
    exact_surs = sum(pred[i] == y_test[i] for i in surs) / len(surs) if surs else 0
    exact_incertains = (sum(pred[i] == y_test[i] for i in range(len(x_test)) if confiances[i] < SEUIL)
                        / max(1, len(x_test) - len(surs)))
    print(f"Seuil de confiance {SEUIL} : {len(surs)}/{len(x_test)} commentaires retenus, exactitude {exact_surs:.3f} "
          f"(contre {exact_incertains:.3f} pour les commentaires incertains)")

    MODELE.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(modele, MODELE)
    json.dump({"modele": choisi, "corpus": len(x), "test": len(x_test), "comparaison": comparaison,
               "exactitude_test": round(accuracy_score(y_test, pred), 4),
               "f1_macro_test": round(f1_score(y_test, pred, average="macro"), 4),
               "par_classe": {c: {k: round(rapport[c][k], 4) for k in ("precision", "recall", "f1-score", "support")} for c in CLASSES},
               "matrice_confusion": {"classes": CLASSES, "valeurs": matrice}, "ms_par_commentaire": round(ms, 2),
               "seuil": {"valeur": SEUIL, "retenus": len(surs), "exactitude_retenus": round(exact_surs, 4),
                         "exactitude_incertains": round(exact_incertains, 4)},
               "erreurs": erreurs}, open(RAPPORT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump({"modele": choisi, "exactitude_test": round(accuracy_score(y_test, pred), 4),
               "f1_macro_test": round(f1_score(y_test, pred, average="macro"), 4), "corpus": len(x),
               "entraine_le": time.strftime("%Y-%m-%d")}, open(INFOS, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"\nModèle enregistré : {MODELE.relative_to(ICI.parent)}")


if __name__ == "__main__":
    main()
