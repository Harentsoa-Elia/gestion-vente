"""Fuseau horaire de Madagascar (EAT, UTC+3, sans heure d'été).

Les dates sont enregistrées en UTC ; on les convertit dans ce fuseau pour les afficher
(billets PDF, e-mails). Sous Windows, le module zoneinfo a besoin du paquet « tzdata »
(dans requirements.txt) : s'il manque, on utilise UTC+3 fixe, qui donne la même heure.
"""
from datetime import timedelta, timezone, tzinfo
from zoneinfo import ZoneInfo


def _fuseau() -> tzinfo:
    try:
        return ZoneInfo("Indian/Antananarivo")
    except Exception:
        return timezone(timedelta(hours=3), "EAT")


FUSEAU_MADAGASCAR = _fuseau()
