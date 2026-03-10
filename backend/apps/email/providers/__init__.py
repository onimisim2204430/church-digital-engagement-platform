"""
Provider registry for the email system.

Manages active email providers with priority-based ordering. Wraps all
providers in a ProviderManager that handles circuit breaking, health
caching, failover, and metrics collection.

Phase 2 additions:
- ProviderManager with circuit breaker and health caching
- Reads EMAIL_SERVICE_CONFIG (and falls back to legacy EMAIL_CONFIG)
- Exposes `provider_manager` singleton used by EmailService
"""

import logging
from typing import List, Optional

from django.conf import settings

from .base import AbstractEmailProvider, ProviderResult, EmailPayload
from .smtp import SMTPProvider
from .sendgrid import SendGridProvider
from .manager import ProviderManager

logger = logging.getLogger('email.providers')


def _load_circuit_breaker_settings() -> dict:
    """Read circuit breaker tuning from EMAIL_SERVICE_CONFIG."""
    cfg = getattr(settings, 'EMAIL_SERVICE_CONFIG', {})
    cb = cfg.get('circuit_breaker', {})
    return {
        'failure_threshold': int(cb.get('failure_threshold', 5)),
        'degraded_timeout': int(cb.get('degraded_timeout', 300)),
        'health_cache_ttl': int(cb.get('health_check_interval', 300)),
    }


def _build_providers() -> List[AbstractEmailProvider]:
    """
    Instantiate providers from EMAIL_SERVICE_CONFIG (Phase 2+) or
    EMAIL_CONFIG (Phase 1 legacy), sorted by priority.
    Falls back to a bare SMTPProvider if neither is configured.
    """
    # Support both setting names
    cfg: dict = (
        getattr(settings, 'EMAIL_SERVICE_CONFIG', None)
        or getattr(settings, 'EMAIL_CONFIG', {})
    )
    providers_cfg: list = cfg.get('providers', [])

    providers: List[AbstractEmailProvider] = []

    for entry in sorted(providers_cfg, key=lambda x: x.get('priority', 99)):
        provider_type = entry.get('type', '').upper()

        if not entry.get('enabled', True):
            logger.debug('Provider %s is disabled — skipping', provider_type)
            continue

        provider: Optional[AbstractEmailProvider] = None

        if provider_type == 'SMTP':
            provider = SMTPProvider(config=entry)
        elif provider_type == 'SENDGRID':
            provider = SendGridProvider(config=entry)
        else:
            logger.warning('Unknown provider type "%s" — skipping', provider_type)
            continue

        providers.append(provider)
        logger.info(
            'Registered email provider: %s (priority=%s)',
            provider_type,
            entry.get('priority', 99),
        )

    if not providers:
        logger.warning('No providers configured — falling back to Django SMTP defaults')
        providers.append(SMTPProvider(config={}))

    return providers


class ProviderRegistry:
    """
    Thin wrapper that lazily initialises a ProviderManager on first use.

    Maintains the same public API as the Phase 1 registry so existing
    callers (services.py, tasks.py) need no changes.
    """

    def __init__(self) -> None:
        self._manager: Optional[ProviderManager] = None

    def _ensure_built(self) -> None:
        if self._manager is not None:
            return
        providers = _build_providers()
        cb_settings = _load_circuit_breaker_settings()
        self._manager = ProviderManager(providers=providers, **cb_settings)

    # ------------------------------------------------------------------
    # Public API (mirrors Phase 1 ProviderRegistry)
    # ------------------------------------------------------------------

    def get_active_provider(self) -> AbstractEmailProvider:
        """Return the first healthy provider (for single-provider callers)."""
        self._ensure_built()
        for p in self._manager._providers:
            if p.health_check():
                return p
        return self._manager._providers[0]

    def get_all_providers(self) -> List[AbstractEmailProvider]:
        self._ensure_built()
        return list(self._manager._providers)

    def send_with_failover(self, payload: EmailPayload, email_type: str = '') -> ProviderResult:
        """
        Deliver `payload` with circuit-breaker-aware provider failover.

        This is the main call used by EmailService._send_now().
        """
        self._ensure_built()
        return self._manager.send(payload, email_type=email_type)

    def run_health_checks(self):
        """Called by the Celery beat health check task."""
        self._ensure_built()
        return self._manager.run_health_checks()

    def get_status(self):
        """Called by the management command."""
        self._ensure_built()
        return self._manager.get_status()

    def reset(self) -> None:
        """Force re-initialisation (useful in tests)."""
        self._manager = None


# Module-level singleton
provider_registry = ProviderRegistry()


def get_email_provider() -> AbstractEmailProvider:
    """Convenience shortcut."""
    return provider_registry.get_active_provider()

