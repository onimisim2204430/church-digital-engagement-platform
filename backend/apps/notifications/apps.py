from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """Application configuration for notifications."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.notifications'
    verbose_name = 'Notifications'

    def ready(self) -> None:
        """Load local signal definitions."""
        import apps.notifications.signals  # noqa: F401
