"""
Constants and enumerations for the standalone email service.

All choices classes use Django's TextChoices so they integrate directly
with CharField(choices=...) model fields.
"""

from django.db import models


class EmailType(models.TextChoices):
    """The functional category of an outgoing email."""

    VERIFICATION = 'VERIFICATION', 'Email Verification'
    PASSWORD_RESET = 'PASSWORD_RESET', 'Password Reset'
    SECURITY_ALERT = 'SECURITY_ALERT', 'Security Alert'
    TRANSACTIONAL = 'TRANSACTIONAL', 'Transactional'
    NOTIFICATION = 'NOTIFICATION', 'Notification'
    BULK = 'BULK', 'Bulk / Campaign'


class EmailStatus(models.TextChoices):
    """Lifecycle state of an EmailMessage record."""

    PENDING = 'PENDING', 'Pending'
    QUEUED = 'QUEUED', 'Queued'
    SENDING = 'SENDING', 'Sending'
    SENT = 'SENT', 'Sent'
    DELIVERED = 'DELIVERED', 'Delivered'
    FAILED = 'FAILED', 'Failed'
    BOUNCED = 'BOUNCED', 'Bounced'
    COMPLAINED = 'COMPLAINED', 'Complained (Spam)'
    OPENED = 'OPENED', 'Opened'
    CLICKED = 'CLICKED', 'Clicked'


class EmailPriority(models.TextChoices):
    """Sending priority; higher priority emails bypass queue throttling."""

    LOW = 'LOW', 'Low'
    MEDIUM = 'MEDIUM', 'Medium'
    HIGH = 'HIGH', 'High'
    CRITICAL = 'CRITICAL', 'Critical'


class ProviderType(models.TextChoices):
    """Supported outgoing email provider backends."""

    SMTP = 'SMTP', 'SMTP'
    SENDGRID = 'SENDGRID', 'SendGrid'
    SES = 'SES', 'Amazon SES'
    MAILGUN = 'MAILGUN', 'Mailgun'


class TrackingEventType(models.TextChoices):
    """Types of tracking events emitted by providers or the tracking pixel."""

    SENT = 'SENT', 'Sent'
    DELIVERED = 'DELIVERED', 'Delivered'
    OPENED = 'OPENED', 'Opened'
    CLICKED = 'CLICKED', 'Clicked'
    BOUNCED = 'BOUNCED', 'Bounced'
    COMPLAINED = 'COMPLAINED', 'Complained (Spam)'
    UNSUBSCRIBED = 'UNSUBSCRIBED', 'Unsubscribed'


class UnsubscribeAction(models.TextChoices):
    """Actions recorded in the GDPR consent audit log."""

    SUBSCRIBED = 'SUBSCRIBED', 'Subscribed'
    UNSUBSCRIBED = 'UNSUBSCRIBED', 'Unsubscribed'
    UPDATED = 'UPDATED', 'Preferences Updated'
    RESUBSCRIBED = 'RESUBSCRIBED', 'Re-subscribed'


# ---------------------------------------------------------------------------
# Retry policy configuration (used by tasks.py)
# ---------------------------------------------------------------------------
MAX_RETRY_ATTEMPTS = 3
RETRY_BACKOFF_BASE_SECONDS = 60  # first retry after 1 min, doubles each time

# ---------------------------------------------------------------------------
# Rate-limit windows per email type (requests per window in seconds)
# ---------------------------------------------------------------------------
RATE_LIMIT_WINDOWS: dict = {
    EmailType.VERIFICATION: {'limit': 5, 'window_seconds': 3600},
    EmailType.PASSWORD_RESET: {'limit': 3, 'window_seconds': 3600},
    EmailType.SECURITY_ALERT: {'limit': 10, 'window_seconds': 3600},
    EmailType.TRANSACTIONAL: {'limit': 50, 'window_seconds': 3600},
    EmailType.NOTIFICATION: {'limit': 20, 'window_seconds': 3600},
    EmailType.BULK: {'limit': 5, 'window_seconds': 86400},
}
