"""Tests d'intégration de la route POST /api/v1/ia/sentiment (sans base de données)."""
from fastapi.testclient import TestClient

from app.auth.auth_handler import sign_jwt, sign_jwt_participant
from main import app

client = TestClient(app)  # sans "with" : l'événement de démarrage (connexion à la base) n'est pas lancé
URL = "/api/v1/ia/sentiment"


def entete(jeton):
    return {"Authorization": f"Bearer {jeton['access_token']}"}


def test_sans_jeton_refuse():
    assert client.post(URL, json={"texte": "Super"}).status_code == 403


def test_participant_refuse():
    r = client.post(URL, json={"texte": "Super"}, headers=entete(sign_jwt_participant("p@test.mg", 1)))
    assert r.status_code == 403


def test_organisateur_obtient_le_sentiment_et_les_points():
    r = client.post(URL, json={"texte": "Trop cher et trop loin, je ne viendrai pas"},
                    headers=entete(sign_jwt("o@test.mg", 1, "organisateur")))
    assert r.status_code == 200
    d = r.json()
    assert d["sentiment"] == "negatif"
    assert d["points"] == -2
    assert set(d["probabilites"]) == {"positif", "neutre", "negatif"}


def test_texte_vide_rejete_par_la_validation():
    r = client.post(URL, json={"texte": ""}, headers=entete(sign_jwt("a@test.mg", 2, "admin")))
    assert r.status_code == 422
