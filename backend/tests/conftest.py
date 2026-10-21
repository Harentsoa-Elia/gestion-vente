"""Configuration des tests : lancer "pytest" depuis le dossier backend, environnement virtuel activé."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
# valeurs de test si le fichier .env ne les fournit pas (aucune base de données n'est nécessaire)
os.environ.setdefault("secret", "cle-de-test")
os.environ.setdefault("algorithm", "HS256")
os.environ.setdefault("QR_SECRET_KEY", "_Ab2-9hg1434uGJzmzyjKSxbBWfX3eufjXq9FvnCtFY=")
