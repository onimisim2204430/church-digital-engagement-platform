from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    """Application configuration for payments."""

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.payments'
    verbose_name = 'Payments'

    def ready(self) -> None:
        """Import signals for payment lifecycle hooks."""
        import apps.payments.signals  # noqa: F401
