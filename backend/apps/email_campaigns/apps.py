"""
AppConfig for email_campaigns app.
"""

from django.apps import AppConfig


class EmailCampaignsConfig(AppConfig):
    """Configuration for the email campaigns application."""
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.email_campaigns'
    verbose_name = 'Email Campaigns'
