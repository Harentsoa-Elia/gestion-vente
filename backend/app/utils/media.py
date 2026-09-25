"""Enregistrement des images envoyées par les organisateurs (affiches, visuels des propositions).

Les fichiers sont ré-encodés avec Pillow avant d'être écrits : on n'enregistre jamais tel quel
un fichier reçu, ce qui écarte les faux fichiers image et retire les métadonnées (position GPS…).
Ils sont servis par FastAPI sous /media (voir main.py) ; le dossier media/ n'est pas versionné.
"""
from io import BytesIO
from pathlib import Path
from typing import Optional
from uuid import uuid4

from PIL import Image, ImageOps, UnidentifiedImageError

MEDIA_DIR = Path(__file__).resolve().parents[2] / "media"
PREFIXE_URL = "/media"

TAILLE_MAX_OCTETS = 8 * 1024 * 1024  # 8 Mo
COTE_MAX_PX = 1600
FORMATS_ACCEPTES = {"JPEG", "PNG", "WEBP"}


class ImageInvalide(ValueError):
    pass


def enregistrer_image(contenu: bytes, dossier: str) -> str:
    """Vérifie, redimensionne et enregistre l'image ; renvoie son URL relative (/media/...)."""
    if not contenu:
        raise ImageInvalide("Aucune image reçue.")
    if len(contenu) > TAILLE_MAX_OCTETS:
        raise ImageInvalide("Image trop lourde : 8 Mo maximum.")
    try:
        image = Image.open(BytesIO(contenu))
        format_origine = image.format
        image.load()
    except (UnidentifiedImageError, OSError):
        raise ImageInvalide("Ce fichier n'est pas une image lisible (JPEG, PNG ou WebP).")
    if format_origine not in FORMATS_ACCEPTES:
        raise ImageInvalide("Format non accepté : utilisez JPEG, PNG ou WebP.")

    image = ImageOps.exif_transpose(image).convert("RGB")
    image.thumbnail((COTE_MAX_PX, COTE_MAX_PX))

    cible = MEDIA_DIR / dossier
    cible.mkdir(parents=True, exist_ok=True)
    nom = f"{uuid4().hex}.jpg"
    image.save(cible / nom, "JPEG", quality=82, optimize=True, progressive=True)
    return f"{PREFIXE_URL}/{dossier}/{nom}"


def supprimer_image(url: Optional[str]) -> None:
    """Supprime le fichier d'une image enregistrée par enregistrer_image (sans effet sinon)."""
    if not url or not url.startswith(PREFIXE_URL + "/"):
        return
    chemin = (MEDIA_DIR / url[len(PREFIXE_URL) + 1:]).resolve()
    # sécurité : ne jamais sortir du dossier media
    if MEDIA_DIR.resolve() in chemin.parents and chemin.is_file():
        chemin.unlink()
