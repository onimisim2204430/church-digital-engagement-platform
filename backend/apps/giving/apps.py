"""Giving app configuration."""

from django.apps import AppConfig


class GivingConfig(AppConfig):
    """Configuration for giving/seed catalog app."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.giving'
    verbose_name = 'Giving & Seed Items'

    def ready(self):
        # Import signal receivers to hook into payment events
        from . import receivers  # noqa: F401
