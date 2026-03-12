"""
AppConfig for content app.
"""

from django.apps import AppConfig


class ContentConfig(AppConfig):
    """Configuration for the content application."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.content'
    verbose_name = 'Content Management'
