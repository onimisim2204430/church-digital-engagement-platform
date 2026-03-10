"""
Custom exceptions for the email provider system.

Using a typed exception hierarchy lets callers distinguish between
recoverable errors (rate limit, temporary failure) and permanent ones
(bad API key, invalid address) without parsing error strings.

Exception Hierarchy
-------------------
ProviderError
├── ProviderConfigurationError   — misconfigured or missing credentials
├── ProviderAuthenticationError  — API key rejected / SMTP auth failed
├── ProviderRateLimitError       — 429 / sending-limit exceeded
├── ProviderTemporaryFailureError — 5xx, connection timeout, network outage
└── ProviderPermanentFailureError — bad recipient, bounced address, invalid domain
"""


class ProviderError(Exception):
    """
    Base class for all email provider errors.

    Attributes:
        provider_name: Which provider raised the error.
        error_code:    Provider-specific error code (e.g. "550", "invalid_api_key").
        retryable:     Whether the calling code should schedule a retry.
    """

    retryable: bool = False

    def __init__(
        self,
        message: str,
        provider_name: str = '',
        error_code: str = '',
    ) -> None:
        super().__init__(message)
        self.provider_name = provider_name
        self.error_code = error_code

    def __str__(self) -> str:
        parts = [super().__str__()]
        if self.provider_name:
            parts.append(f'[provider={self.provider_name}]')
        if self.error_code:
            parts.append(f'[code={self.error_code}]')
        return ' '.join(parts)


class ProviderConfigurationError(ProviderError):
    """
    Required configuration is missing or invalid.

    Examples:
    - API key env-var not set
    - SMTP host not configured
    - Invalid endpoint URL

    Not retryable — the configuration must be fixed first.
    """

    retryable = False


class ProviderAuthenticationError(ProviderError):
    """
    The provider rejected our credentials.

    Examples:
    - SendGrid: 401 Unauthorized / 403 Forbidden
    - SMTP: 535 Authentication failed

    Not retryable without new credentials.
    """

    retryable = False


class ProviderRateLimitError(ProviderError):
    """
    The provider is throttling our requests.

    Examples:
    - SendGrid: 429 Too Many Requests

    Retryable after `retry_after` seconds.

    Attributes:
        retry_after: Seconds to wait before the next attempt (from Retry-After header).
    """

    retryable = True

    def __init__(
        self,
        message: str,
        provider_name: str = '',
        error_code: str = '',
        retry_after: int = 60,
    ) -> None:
        super().__init__(message, provider_name, error_code)
        self.retry_after = retry_after


class ProviderTemporaryFailureError(ProviderError):
    """
    A transient error that the provider or network layer returned.

    Examples:
    - HTTP 500 / 502 / 503 from SendGrid
    - SMTP connection timeout
    - DNS resolution failure

    Retryable with exponential backoff.
    """

    retryable = True


class ProviderPermanentFailureError(ProviderError):
    """
    A failure that will not resolve by retrying.

    Examples:
    - Invalid recipient address (550 No such user)
    - Domain does not exist
    - SendGrid suppression list hit

    Not retryable — remove or fix the recipient address.
    """

    retryable = False
