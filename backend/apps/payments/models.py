"""Database models for payment transactions."""

import logging
import uuid

from django.conf import settings
from django.db import models

logger = logging.getLogger('payments')


class PaymentStatus(models.TextChoices):
    """Supported transaction states.
    
    State transitions:
    PENDING → PROCESSING → SUCCESS (✓)
    PENDING → PROCESSING → FAILED (✓)
    PENDING → FAILED (✓)
    PENDING → CANCELLED (✓)
    No backward transitions allowed.
    """

    PENDING = 'PENDING', 'Pending'
    PROCESSING = 'PROCESSING', 'Processing'
    SUCCESS = 'SUCCESS', 'Success'
    FAILED = 'FAILED', 'Failed'
    CANCELLED = 'CANCELLED', 'Cancelled'


class PaymentTransaction(models.Model):
    """Stores Paystack transaction lifecycle and audit data."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_transactions',
    )
    email = models.EmailField()
    amount = models.PositiveBigIntegerField(help_text='Amount in the smallest currency unit')
    currency = models.CharField(max_length=10, default='NGN')
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    status = models.CharField(
        max_length=10,
        choices=PaymentStatus.choices,
        default=PaymentStatus.PENDING,
        db_index=True,
    )
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    gateway_response = models.TextField(blank=True, null=True)
    paid_at = models.DateTimeField(blank=True, null=True)
    amount_verified = models.BooleanField(default=False, help_text='Amount validated against intent')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'payment_transactions'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['reference']),
            models.Index(fields=['amount_verified', 'status'], name='pay_tx_amtv_st_idx'),
        ]

    def __str__(self) -> str:
        """Human readable model representation."""
        return f'{self.reference} ({self.status})'

    # Legal state transitions
    LEGAL_TRANSITIONS = {
        PaymentStatus.PENDING: {PaymentStatus.PROCESSING, PaymentStatus.FAILED, PaymentStatus.CANCELLED},
        PaymentStatus.PROCESSING: {PaymentStatus.SUCCESS, PaymentStatus.FAILED},
        PaymentStatus.SUCCESS: set(),  # Terminal state
        PaymentStatus.FAILED: set(),  # Terminal state
        PaymentStatus.CANCELLED: set(),  # Terminal state
    }

    def can_transition_to(self, new_status: str) -> bool:
        """Check if transition from current to new status is legal."""
        if new_status == self.status:
            return True
        return new_status in self.LEGAL_TRANSITIONS.get(self.status, set())

    def transition_to(self, new_status: str) -> bool:
        """Attempt to transition to a new status.
        
        Returns:
            True if transition was successful, False if illegal.
        """
        if not self.can_transition_to(new_status):
            logger.warning(
                f'Illegal state transition attempted',
                extra={'reference': self.reference, 'from': self.status, 'to': new_status}
            )
            return False
        self.status = new_status
        return True

class PaymentIntent(models.Model):
    """Pre-authorization for payments to prevent abuse and fraud."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='payment_intents',
    )
    email = models.EmailField()
    amount = models.PositiveBigIntegerField(help_text='Amount in the smallest currency unit')
    currency = models.CharField(max_length=10, default='NGN')
    purpose = models.CharField(
        max_length=200,
        help_text='Purpose of payment (e.g., donation, subscription, purchase)',
    )
    metadata = models.JSONField(default=dict, blank=True)
    
    # Rate limiting and fraud prevention
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    is_used = models.BooleanField(default=False, db_index=True)
    transaction = models.OneToOneField(
        PaymentTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_intent',
    )
    
    expires_at = models.DateTimeField(help_text='Intent expires at this time')
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'payment_intents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email', 'is_used']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self) -> str:
        return f'{self.email} — {self.amount} ({self.purpose})'

    @property
    def is_expired(self) -> bool:
        """Check if intent has expired."""
        from django.utils import timezone
        return timezone.now() > self.expires_at

    @property
    def can_use(self) -> bool:
        """Check if intent can still be used."""
        return not self.is_used and not self.is_expired


class PaymentAuditLog(models.Model):
    """Immutable audit trail for all payment activities."""

    class EventType(models.TextChoices):
        # Initialization events
        INTENT_CREATED = 'INTENT_CREATED', 'Payment Intent Created'
        INTENT_EXPIRED = 'INTENT_EXPIRED', 'Payment Intent Expired'
        
        # Transaction lifecycle
        TX_INITIALIZED = 'TX_INITIALIZED', 'Transaction Initialized'
        TX_VERIFICATION_STARTED = 'TX_VERIFICATION_STARTED', 'Verification Started'
        TX_VERIFICATION_SUCCESS = 'TX_VERIFICATION_SUCCESS', 'Verification Successful'
        TX_VERIFICATION_FAILED = 'TX_VERIFICATION_FAILED', 'Verification Failed'
        
        # Webhook events
        WEBHOOK_RECEIVED = 'WEBHOOK_RECEIVED', 'Webhook Received'
        WEBHOOK_VALIDATED = 'WEBHOOK_VALIDATED', 'Webhook Signature Valid'
        WEBHOOK_REJECTED = 'WEBHOOK_REJECTED', 'Webhook Rejected'
        WEBHOOK_PROCESSED = 'WEBHOOK_PROCESSED', 'Webhook Processed'
        WEBHOOK_DUPLICATE = 'WEBHOOK_DUPLICATE', 'Duplicate Webhook (Idempotent)'
        
        # Error events
        GATEWAY_ERROR = 'GATEWAY_ERROR', 'Gateway Error'
        NETWORK_ERROR = 'NETWORK_ERROR', 'Network Error'
        VALIDATION_ERROR = 'VALIDATION_ERROR', 'Validation Error'
        
        # Security events
        FRAUD_DETECTED = 'FRAUD_DETECTED', 'Potential Fraud Detected'
        RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED', 'Rate Limit Exceeded'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(
        PaymentTransaction,
        on_delete=models.CASCADE,
        related_name='audit_logs',
        null=True,
        blank=True,
    )
    intent = models.ForeignKey(
        PaymentIntent,
        on_delete=models.SET_NULL,
        related_name='audit_logs',
        null=True,
        blank=True,
    )
    
    event_type = models.CharField(
        max_length=50,
        choices=EventType.choices,
        db_index=True,
    )
    message = models.TextField()
    
    # Request context for debugging
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True, null=True)
    request_path = models.CharField(max_length=500, blank=True, null=True)
    request_method = models.CharField(max_length=10, blank=True, null=True)
    
    # Response/Error details
    status_code = models.IntegerField(null=True, blank=True)
    response_data = models.JSONField(default=dict, blank=True)
    error_details = models.TextField(blank=True, null=True)
    
    # Metadata for analysis
    severity = models.CharField(
        max_length=10,
        choices=[
            ('INFO', 'Info'),
            ('WARNING', 'Warning'),
            ('ERROR', 'Error'),
            ('CRITICAL', 'Critical'),
        ],
        default='INFO',
    )
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'payment_audit_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['event_type', 'created_at']),
            models.Index(fields=['transaction', 'event_type']),
            models.Index(fields=['severity', 'created_at']),
            models.Index(fields=['severity', '-created_at'], name='pay_aud_sev_cts_idx'),
        ]

    def __str__(self) -> str:
        return f'{self.event_type} — {self.created_at}'