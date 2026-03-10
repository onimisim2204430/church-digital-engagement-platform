"""
EmailConfig — Django AppConfig for the standalone email service.

Registers signals and performs startup validation on Django's ready() hook.
"""

import logging

from django.apps import AppConfig

logger = logging.getLogger('email.app')


class EmailConfig(AppConfig):
    """AppConfig for the standalone email service application."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.email'
    verbose_name = 'Email Service'

    def ready(self) -> None:
        """
        Called once Django is fully loaded.

        - Imports signal handlers so they are registered.
        - Logs a startup confirmation that the email app is active.
        """
        try:
            import apps.email.signals  # noqa: F401 — side-effect import
        except ImportError:
            # signals.py is created in a later phase; fail silently here
            pass

        logger.info('Email service app ready.')
