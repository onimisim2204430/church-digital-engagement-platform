"""
Database models for the standalone email service.

Design principles:
- UUID primary keys on every model (matches existing project convention)
- All FKs to AUTH_USER_MODEL use null=True so emails can be sent to
  non-registered addresses (e.g., bulk campaigns or transactional receipts)
- EmailMessage is the central entity; all other models reference it
- Composite indexes on the most common query patterns
- Sensitive provider credentials are stored as references to env-var names,
  never as plain values in the database
"""

import uuid

from django.conf import settings
from django.db import models

from .constants import (
    EmailPriority,
    EmailStatus,
    EmailType,
    ProviderType,
    TrackingEventType,
    UnsubscribeAction,
)


# ---------------------------------------------------------------------------
# 1. EmailProviderConfig
# ---------------------------------------------------------------------------

class EmailProviderConfig(models.Model):
    """
    Stores per-provider configuration (credentials, endpoint overrides, priority).

    Credentials are stored as the *names* of environment variables so that
    secret values never end up in the database.  At runtime the provider
    reads the actual values via os.environ.

    Example:
        api_key_env_var = "SENDGRID_API_KEY"
        → provider calls os.environ["SENDGRID_API_KEY"] at send time
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100, unique=True)
    provider_type = models.CharField(
        max_length=20,
        choices=ProviderType.choices,
        db_index=True,
    )
    is_active = models.BooleanField(default=True, db_index=True)
    # Lower number = tried first during failover
    priority = models.PositiveSmallIntegerField(default=10)

    # SMTP-specific (optional; ignored by API-based providers)
    smtp_host_env_var = models.CharField(max_length=100, blank=True)
    smtp_port_env_var = models.CharField(max_length=100, blank=True)
    smtp_user_env_var = models.CharField(max_length=100, blank=True)
    smtp_password_env_var = models.CharField(max_length=100, blank=True)
    smtp_use_tls = models.BooleanField(default=True)

    # API-based providers (SendGrid, SES, Mailgun)
    api_key_env_var = models.CharField(max_length=100, blank=True)
    api_endpoint = models.URLField(blank=True)

    # Sending identity
    default_from_email = models.EmailField(blank=True)
    default_from_name = models.CharField(max_length=100, blank=True)

    # Extra free-form JSON for provider-specific settings
    extra_config = models.JSONField(default=dict, blank=True)

    # ------------------------------------------------------------------
    # Circuit breaker state  (Phase 2)
    # ------------------------------------------------------------------
    circuit_open = models.BooleanField(
        default=False,
        help_text='True when the circuit breaker has tripped this provider.',
    )
    degraded_until = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Timestamp until which this provider is considered degraded.',
    )

    # ------------------------------------------------------------------
    # Delivery metrics  (Phase 2)
    # ------------------------------------------------------------------
    success_count = models.PositiveIntegerField(default=0)
    failure_count = models.PositiveIntegerField(default=0)
    last_success = models.DateTimeField(null=True, blank=True)
    last_failure = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_provider_configs'
        ordering = ['priority', 'name']
        verbose_name = 'Email Provider Config'
        verbose_name_plural = 'Email Provider Configs'

    def __str__(self) -> str:
        status = 'active' if self.is_active else 'inactive'
        return f'{self.name} ({self.provider_type}) — {status}'


# ---------------------------------------------------------------------------
# 2. EmailTemplate
# ---------------------------------------------------------------------------

class EmailTemplate(models.Model):
    """
    Reusable email templates stored in the database.

    Templates support Django template syntax ({{ variable }}).  The
    template engine will look up the slug and render both HTML and plain-text
    versions using a supplied context dict.

    Use the `version` field to keep old templates around while rolling
    out a new design — only the active=True + highest version is used.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(max_length=100, db_index=True)
    version = models.PositiveSmallIntegerField(default=1)
    email_type = models.CharField(
        max_length=30,
        choices=EmailType.choices,
        db_index=True,
    )
    is_active = models.BooleanField(default=True, db_index=True)

    # Template content
    subject = models.CharField(max_length=255)
    html_body = models.TextField(help_text='Django template syntax supported.')
    text_body = models.TextField(
        blank=True,
        help_text='Plain-text fallback. Auto-generated from HTML if left blank.',
    )

    # Template inheritance — a template can extend another template
    parent_template = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='child_templates',
        help_text='Optional parent template for subject/layout inheritance.',
    )

    # Metadata
    description = models.CharField(max_length=255, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_email_templates',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # ------------------------------------------------------------------
    # Usage tracking  (Phase 3)
    # ------------------------------------------------------------------
    last_used = models.DateTimeField(
        null=True, blank=True,
        help_text='Timestamp of the most recent render of this template.',
    )
    usage_count = models.PositiveIntegerField(
        default=0,
        help_text='Total number of times this template has been rendered.',
    )

    class Meta:
        db_table = 'email_templates'
        unique_together = [('slug', 'version')]
        ordering = ['slug', '-version']
        verbose_name = 'Email Template'
        verbose_name_plural = 'Email Templates'
        indexes = [
            models.Index(fields=['slug', 'is_active', '-version'], name='email_tmpl_slug_active_idx'),
            models.Index(fields=['email_type', 'is_active'], name='email_tmpl_type_active_idx'),
        ]

    def __str__(self) -> str:
        return f'{self.slug} v{self.version} ({self.email_type})'


# ---------------------------------------------------------------------------
# 3. EmailMessage  (central entity)
# ---------------------------------------------------------------------------

class EmailMessage(models.Model):
    """
    Represents a single email send attempt and its full lifecycle.

    This is the central model that every other part of the email service
    references.  Each API call, Celery task, provider invocation, and
    tracking event links back to one EmailMessage row.

    Retry logic:
        retry_count tracks how many times we have already attempted
        delivery.  The Celery task increments it before each retry and
        stops when retry_count >= max_retries.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Addressing
    to_email = models.EmailField(db_index=True)
    to_name = models.CharField(max_length=255, blank=True)
    from_email = models.EmailField()
    from_name = models.CharField(max_length=100, blank=True)
    reply_to = models.EmailField(blank=True)

    # Content (stored after rendering the template)
    subject = models.CharField(max_length=255)
    body_html = models.TextField(blank=True)
    body_text = models.TextField(blank=True)

    # Categorisation
    email_type = models.CharField(
        max_length=30,
        choices=EmailType.choices,
        db_index=True,
    )
    priority = models.CharField(
        max_length=10,
        choices=EmailPriority.choices,
        default=EmailPriority.MEDIUM,
        db_index=True,
    )

    # Delivery state
    status = models.CharField(
        max_length=20,
        choices=EmailStatus.choices,
        default=EmailStatus.PENDING,
        db_index=True,
    )
    provider_used = models.CharField(
        max_length=20,
        choices=ProviderType.choices,
        blank=True,
    )
    # Message-ID returned by the provider (used to match webhook events)
    provider_message_id = models.CharField(max_length=255, blank=True, db_index=True)

    # Retry tracking
    retry_count = models.PositiveSmallIntegerField(default=0)
    max_retries = models.PositiveSmallIntegerField(default=3)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    scheduled_at = models.DateTimeField(null=True, blank=True, db_index=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    failed_at = models.DateTimeField(null=True, blank=True)

    # Error tracking
    error_message = models.TextField(blank=True)

    # ------------------------------------------------------------------
    # Rendered content  (Phase 3)
    # Stored after template rendering so the rendered output is preserved
    # even if the template is later modified or deleted.
    # ------------------------------------------------------------------
    rendered_html = models.TextField(
        blank=True,
        help_text='Final HTML output after template rendering.',
    )
    rendered_text = models.TextField(
        blank=True,
        help_text='Final plain-text output after template rendering.',
    )
    rate_limit_key = models.CharField(
        max_length=128,
        blank=True,
        help_text='Redis rate-limit key that was checked for this message.',
    )

    # Optional link to an authenticated user
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_messages',
        db_index=True,
    )

    # Optional link to the template used
    template = models.ForeignKey(
        EmailTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='messages',
    )

    # Free-form data (campaign ID, order ID, post ID, etc.)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'email_messages'
        ordering = ['-created_at']
        verbose_name = 'Email Message'
        verbose_name_plural = 'Email Messages'
        indexes = [
            models.Index(fields=['status', '-created_at'], name='email_msg_status_cts_idx'),
            models.Index(fields=['email_type', 'status'], name='email_msg_type_status_idx'),
            models.Index(fields=['to_email', '-created_at'], name='email_msg_to_cts_idx'),
            models.Index(fields=['user', '-created_at'], name='email_msg_user_cts_idx'),
            models.Index(fields=['priority', 'status'], name='email_msg_pri_status_idx'),
            models.Index(
                fields=['status', 'retry_count', 'scheduled_at'],
                name='email_msg_retry_idx',
            ),
        ]

    def __str__(self) -> str:
        return f'[{self.status}] {self.email_type} → {self.to_email} ({self.id})'

    @property
    def can_retry(self) -> bool:
        """True if this message has not yet exhausted its retry budget."""
        return self.retry_count < self.max_retries and self.status == EmailStatus.FAILED


# ---------------------------------------------------------------------------
# 4. EmailEvent  (tracking events)
# ---------------------------------------------------------------------------

class EmailEvent(models.Model):
    """
    Immutable record of a single tracking event for one EmailMessage.

    Events arrive from:
    - Provider webhooks (SendGrid, SES) for DELIVERED / BOUNCED / COMPLAINED
    - The in-app tracking pixel for OPENED
    - The click-redirect endpoint for CLICKED
    - The unsubscribe endpoint for UNSUBSCRIBED
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        EmailMessage,
        on_delete=models.CASCADE,
        related_name='events',
        db_index=True,
    )
    event_type = models.CharField(
        max_length=20,
        choices=TrackingEventType.choices,
        db_index=True,
    )
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    # Network info (from pixel requests / webhook payloads)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)

    # For CLICKED events: the URL that was actually visited
    clicked_url = models.URLField(max_length=2048, blank=True)

    # Raw payload from the provider webhook or our own pixel handler
    event_data = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = 'email_events'
        ordering = ['-timestamp']
        verbose_name = 'Email Event'
        verbose_name_plural = 'Email Events'
        indexes = [
            models.Index(fields=['message', 'event_type'], name='email_evt_msg_type_idx'),
            models.Index(fields=['event_type', '-timestamp'], name='email_evt_type_ts_idx'),
        ]

    def __str__(self) -> str:
        return f'{self.event_type} @ {self.timestamp:%Y-%m-%d %H:%M} for {self.message_id}'


# ---------------------------------------------------------------------------
# 5. EmailUnsubscribe
# ---------------------------------------------------------------------------

class EmailUnsubscribe(models.Model):
    """
    Records that a particular email address has opted out of one or more
    email categories.

    - `categories` = [] means the recipient unsubscribed from everything.
    - `all_categories` = True is a short-circuit: skip the send regardless
      of what category is requested.
    - `token` is the HMAC-signed value embedded in the unsubscribe link;
      stored here so it can be validated without needing the secret each time.
    """

    UNSUBSCRIBE_SOURCES = [
        ('LINK', 'Unsubscribe Link'),
        ('WEBHOOK', 'Provider Webhook'),
        ('MANUAL', 'Manual (Admin)'),
        ('API', 'API Request'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(db_index=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_unsubscribes',
        db_index=True,
    )

    # Which categories the recipient opted out of; empty list = all
    categories = models.JSONField(default=list, blank=True)
    all_categories = models.BooleanField(default=False, db_index=True)

    # Signed token that was in the unsubscribe URL
    token = models.CharField(max_length=512, blank=True)

    source = models.CharField(max_length=20, choices=UNSUBSCRIBE_SOURCES, default='LINK')

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_unsubscribes'
        ordering = ['-created_at']
        verbose_name = 'Email Unsubscribe'
        verbose_name_plural = 'Email Unsubscribes'
        indexes = [
            models.Index(fields=['email', 'all_categories'], name='email_unsub_email_all_idx'),
        ]

    def __str__(self) -> str:
        scope = 'ALL' if self.all_categories else ', '.join(self.categories) or 'all'
        return f'{self.email} — unsubscribed from {scope}'


# ---------------------------------------------------------------------------
# 6. EmailConsentLog  (GDPR audit trail)
# ---------------------------------------------------------------------------

class EmailConsentLog(models.Model):
    """
    Immutable GDPR audit trail for every consent change.

    Each row is written once on creation and never modified.  Together
    these rows prove:
    - When consent was given or withdrawn
    - What IP address / user-agent the change originated from
    - Which email category was affected
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='email_consent_logs',
        db_index=True,
    )
    # Store the email directly in case the user account is later deleted
    email = models.EmailField(db_index=True)

    action = models.CharField(
        max_length=20,
        choices=UnsubscribeAction.choices,
        db_index=True,
    )
    # Which email category this consent change applies to (empty = all)
    category = models.CharField(max_length=30, blank=True)

    # Request metadata for audit purposes
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=512, blank=True)

    # Any additional context (e.g. {"source": "unsubscribe_link", "campaign_id": "..."})
    extra_data = models.JSONField(default=dict, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'email_consent_logs'
        ordering = ['-timestamp']
        verbose_name = 'Email Consent Log'
        verbose_name_plural = 'Email Consent Logs'
        indexes = [
            models.Index(fields=['email', '-timestamp'], name='email_consent_email_ts_idx'),
            models.Index(fields=['user', '-timestamp'], name='email_consent_user_ts_idx'),
            models.Index(fields=['action', '-timestamp'], name='email_consent_action_ts_idx'),
        ]

    def __str__(self) -> str:
        return f'{self.action} — {self.email} @ {self.timestamp:%Y-%m-%d %H:%M}'


# ---------------------------------------------------------------------------
# 7. EmailRateLimit
# ---------------------------------------------------------------------------

class EmailRateLimit(models.Model):
    """
    Sliding-window rate-limit counter stored in the database.

    Used as a fallback when Redis is unavailable.  The primary rate-limit
    mechanism (Phase 3) uses Redis; this table is a durable audit copy and
    safety net.

    The `window_start` + `window_seconds` pair defines the window.
    `count` is incremented atomically via F() expressions.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='email_rate_limits',
        db_index=True,
    )
    # For non-authenticated sends, track by email address
    email = models.EmailField(blank=True, db_index=True)

    email_type = models.CharField(
        max_length=30,
        choices=EmailType.choices,
        db_index=True,
    )
    count = models.PositiveIntegerField(default=0)
    window_start = models.DateTimeField(db_index=True)
    window_seconds = models.PositiveIntegerField(default=3600)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'email_rate_limits'
        ordering = ['-window_start']
        verbose_name = 'Email Rate Limit'
        verbose_name_plural = 'Email Rate Limits'
        indexes = [
            models.Index(
                fields=['user', 'email_type', 'window_start'],
                name='email_rl_user_type_win_idx',
            ),
            models.Index(
                fields=['email', 'email_type', 'window_start'],
                name='email_rl_addr_type_win_idx',
            ),
        ]

    def __str__(self) -> str:
        identifier = str(self.user_id) if self.user_id else self.email
        return f'{identifier} | {self.email_type} | {self.count}/{self.window_seconds}s window'
