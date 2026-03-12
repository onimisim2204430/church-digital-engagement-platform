"""
AppConfig for interactions app.
"""

from django.apps import AppConfig


class InteractionsConfig(AppConfig):
    """Configuration for the interactions application."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.interactions'
    verbose_name = 'User Interactions'
