# app/models/__init__.py
from .concert import Concert
from .ticket import Ticket

# Add other models here if you have more

__all__ = ['Concert', 'Ticket']  # List all model classes
