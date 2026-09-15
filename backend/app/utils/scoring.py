from app.models.interaction_publique import InteractionType

# COMMENTAIRE a un poids de 0 : un commentaire peut etre negatif
# ("ca ne m'interesse pas"), il ne doit donc pas compter comme un signal d'interet positif.
POIDS_INTERACTION = {
    InteractionType.LIKE: 1,
    InteractionType.WAOUH: 2,
    InteractionType.JADORE: 3,
    InteractionType.FAVORI: 2,
    InteractionType.COMMENTAIRE: 0,
}