# app/models/__init__.py
from .concert import Concert
from .ticket import Ticket
from .user import User
from .scan_history import ScanHistory
from .evenement import Evenement
from .artiste import Artiste
from .lieu import Lieu
from .categorie import Categorie
from .proposition import Proposition
from .recommandation import Recommandation
from .interaction_publique import InteractionPublique

__all__ = [
    'Concert',
    'Ticket',
    'User',
    'ScanHistory',
    'Evenement',
    'Artiste',
    'Lieu',
    'Categorie',
    'Proposition',
    'Recommandation',
    'InteractionPublique',
]