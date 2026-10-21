from typing import Optional

from app.models.interaction_publique import InteractionType

POIDS_INTERACTION = {
    InteractionType.LIKE: 1,
    InteractionType.WAOUH: 2,
    InteractionType.JADORE: 3,
    InteractionType.FAVORI: 2,
    # un commentaire vaut 0 tant qu'il n'est pas analysé : son poids dépend de son sentiment (voir POIDS_SENTIMENT)
    InteractionType.COMMENTAIRE: 0,
}

# poids d'un commentaire selon le sentiment détecté par le module d'IA (app/ia/sentiment.py) :
# un commentaire positif compte comme un "Waouh", un commentaire négatif retire autant de points
POIDS_SENTIMENT = {"positif": 2, "neutre": 0, "negatif": -2}
# en dessous de ce seuil, le modèle hésite : le commentaire est gardé mais ne compte pas (0 point)
SEUIL_CONFIANCE = 0.6


def poids(type_interaction, sentiment: Optional[str] = None, confiance: Optional[float] = None) -> int:
    """Points apportés par une interaction (un commentaire non analysé ou incertain vaut 0)."""
    if type_interaction == InteractionType.COMMENTAIRE or type_interaction == "COMMENTAIRE":
        if confiance is None or confiance < SEUIL_CONFIANCE:
            return 0
        return POIDS_SENTIMENT.get(sentiment or "", 0)
    return POIDS_INTERACTION.get(type_interaction, 0)
