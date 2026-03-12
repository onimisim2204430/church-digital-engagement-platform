"""Custom exceptions for the payments app."""


class PaymentError(Exception):
    """Base payment exception."""


class PaymentConfigurationError(PaymentError):
    """Raised when required payment configuration is missing."""


class PaymentInitializationError(PaymentError):
    """Raised when payment initialization fails."""


class PaymentVerificationError(PaymentError):
    """Raised when transaction verification fails."""


class PaymentGatewayError(PaymentError):
    """Raised when Paystack returns unexpected or invalid responses."""


class WebhookValidationError(PaymentError):
    """Raised when webhook validation fails."""
