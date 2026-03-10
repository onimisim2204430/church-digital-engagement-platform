"""
Abstract base classes and shared data-transfer objects for email providers.

Every concrete provider (SMTP, SendGrid, SES, Mailgun …) must subclass
AbstractEmailProvider and implement the three abstract methods:
    - send(payload)         → ProviderResult
    - validate_config()     → None  (raises ValueError on bad config)
    - health_check()        → bool
"""

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Dict, List, Optional

logger = logging.getLogger('email.providers')


# ---------------------------------------------------------------------------
# Data-transfer objects
# ---------------------------------------------------------------------------

@dataclass
class EmailPayload:
    """
    All data required to send a single email.

    Populated by EmailService before handing off to a provider.
    The provider must not mutate this object.
    """

    to_email: str
    to_name: str
    from_email: str
    from_name: str
    subject: str
    body_html: str
    body_text: str = ''
    reply_to: str = ''

    # Optional CC / BCC
    cc: List[str] = field(default_factory=list)
    bcc: List[str] = field(default_factory=list)

    # Custom headers injected into the outgoing message
    # (e.g., List-Unsubscribe, X-Priority, X-Mailer)
    headers: Dict[str, str] = field(default_factory=dict)

    # Internal reference linking this payload to an EmailMessage row
    message_id: Optional[str] = None  # UUID string of EmailMessage.id

    # Extra data passed through to provider-specific features
    # (e.g., SendGrid categories, SES tags)
    extra: Dict = field(default_factory=dict)


@dataclass
class ProviderResult:
    """
    Result returned by AbstractEmailProvider.send().

    success=True  → the provider accepted the message for delivery.
    success=False → the provider rejected or could not process the message.
    """

    success: bool
    provider_name: str
    provider_message_id: str = ''   # Message-ID returned by the provider
    error_message: str = ''
    error_code: str = ''            # Provider-specific error code
    raw_response: Optional[Dict] = None  # Full raw API response for debugging


# ---------------------------------------------------------------------------
# Abstract provider
# ---------------------------------------------------------------------------

class AbstractEmailProvider(ABC):
    """
    Base class for all email provider implementations.

    Sub-classes receive a `config` dict on construction that maps to
    the relevant block inside settings.EMAIL_CONFIG['providers'].
    """

    def __init__(self, config: dict) -> None:
        self.config = config or {}
        self._logger = logging.getLogger(f'email.providers.{self.__class__.__name__}')

    # ------------------------------------------------------------------
    # Abstract interface — all sub-classes MUST implement these
    # ------------------------------------------------------------------

    @abstractmethod
    def send(self, payload: EmailPayload) -> ProviderResult:
        """
        Deliver a single email message.

        Args:
            payload: Fully populated EmailPayload instance.

        Returns:
            ProviderResult with success=True when the provider accepted it,
            or success=False with an error_message on any failure.

        Notes:
            - Must never raise — catch all exceptions and return a failed
              ProviderResult instead, so the registry can try the next provider.
            - Must set provider_message_id when available (used for webhook matching).
        """

    @abstractmethod
    def validate_config(self) -> None:
        """
        Verify that all required configuration values are present.

        Called at startup (ready()) to surface config problems early.

        Raises:
            ValueError: with a descriptive message if config is incomplete.
        """

    @abstractmethod
    def health_check(self) -> bool:
        """
        Lightweight check that the provider is reachable and configured.

        Returns:
            True  if the provider can accept mail right now.
            False if the provider is down, misconfigured, or rate-limited.

        Notes:
            - Must be fast — this is called before every send in the registry.
            - Must never raise.
        """

    # ------------------------------------------------------------------
    # Shared helpers available to all sub-classes
    # ------------------------------------------------------------------

    def _get_from_address(self) -> str:
        """
        Return the canonical 'From' address for this provider.

        Precedence:
            1. config['default_from_email']
            2. Django DEFAULT_FROM_EMAIL
            3. Django EMAIL_HOST_USER (SMTP fallback)
        """
        from django.conf import settings

        return (
            self.config.get('default_from_email')
            or getattr(settings, 'DEFAULT_FROM_EMAIL', '')
            or getattr(settings, 'EMAIL_HOST_USER', '')
        )

    def _get_from_name(self) -> str:
        return self.config.get('default_from_name', '')

    def _build_rfc_from(self, email: str, name: str) -> str:
        """Return a 'Name <email@example.com>' address string."""
        if name:
            return f'{name} <{email}>'
        return email
