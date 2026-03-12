"""Utility helpers for payment processing and validation."""

import hashlib
import hmac
import logging
import os
import secrets
import uuid
from datetime import datetime, timedelta, timezone as dt_timezone
from typing import Any, Optional

from django.utils import timezone
from django.utils.dateparse import parse_datetime

from .models import PaymentIntent, PaymentAuditLog, PaymentTransaction

logger = logging.getLogger('payments')


def generate_payment_reference(prefix: str = 'PAY') -> str:
    """Generate a secure, unique payment reference using UUID.
    
    Format: PAY_<16-char UUID hex>
    This ensures uniqueness and is cryptographically secure.
    
    Examples:
        PAY_a1b2c3d4e5f6g7h8
        PAY_x9y8z7w6v5u4t3s2
    """
    return f'{prefix}_{uuid.uuid4().hex[:16].upper()}'


def safe_int(value: Any, default: int = 0) -> int:
    """Safely cast any value to integer."""
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def parse_paid_at(value: Optional[str]) -> Optional[datetime]:
    """Parse paid_at value into a timezone-aware datetime where possible."""
    if not value:
        return None
    parsed = parse_datetime(value)
    if parsed is None:
        return None
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=dt_timezone.utc)
    return parsed


def verify_paystack_signature(payload: bytes, signature: str) -> bool:
    """Validate Paystack webhook signature using HMAC SHA512."""
    webhook_secret = os.environ.get('PAYSTACK_WEBHOOK_SECRET')
    if not webhook_secret or not signature:
        return False

    expected_signature = hmac.new(
        webhook_secret.encode('utf-8'),
        payload,
        hashlib.sha512,
    ).hexdigest()
    return hmac.compare_digest(expected_signature, signature)


def validate_payment_amount(
    actual_amount: int,
    expected_amount: int,
    tolerance_percent: float = 0.0
) -> tuple[bool, Optional[str]]:
    """Validate payment amount matches expected amount within tolerance.
    
    This is critical for idempotency protection. We must never allow a
    payment to succeed if the amount doesn't match what was authorized.
    
    Args:
        actual_amount: Amount received from gateway (in smallest currency unit)
        expected_amount: Amount we authorized (in smallest currency unit)
        tolerance_percent: Optional tolerance for currency fluctuations (0-5%)
    
    Returns:
        Tuple of (is_valid, error_message)
        - (True, None) if amounts match within tolerance
        - (False, error_message) if validation fails
    
    Examples:
        validate_payment_amount(100000, 100000)  # ✓ Exact match
        validate_payment_amount(100050, 100000, tolerance_percent=1)  # ✓ Within 1%
        validate_payment_amount(99000, 100000)  # ✗ Amount mismatch
    """
    if actual_amount == expected_amount:
        return True, None
    
    if tolerance_percent <= 0:
        return (
            False,
            f'Amount mismatch: expected {expected_amount}, got {actual_amount}'
        )
    
    # Calculate tolerance range
    tolerance = expected_amount * (tolerance_percent / 100)
    min_allowed = expected_amount - tolerance
    max_allowed = expected_amount + tolerance
    
    if min_allowed <= actual_amount <= max_allowed:
        return True, None
    
    return (
        False,
        f'Amount mismatch: expected {expected_amount}, got {actual_amount} '
        f'(tolerance: ±{tolerance_percent}%)'
    )


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Payment Intent Helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


def create_payment_intent(
    email: str,
    amount: int,
    purpose: str,
    metadata: Optional[dict] = None,
    expires_in_minutes: int = 30,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> PaymentIntent:
    """
    Create a payment intent for fraud prevention.

    This pre-authorizes a payment by creating an intent that expires after
    a set duration. This prevents abuse by limiting how many payment attempts
    can be made for the same user/email/amount within a time window.

    Args:
        email: Payer's email address
        amount: Amount in smallest currency unit
        purpose: Payment purpose (e.g., 'donation', 'subscription')
        metadata: Additional data
        expires_in_minutes: How long before intent expires (default: 30)
        ip_address: Requester IP for fraud detection
        user_agent: Requester user-agent for fraud detection

    Returns:
        PaymentIntent instance
    """
    intent = PaymentIntent.objects.create(
        email=email,
        amount=amount,
        purpose=purpose,
        metadata=metadata or {},
        ip_address=ip_address,
        user_agent=user_agent,
        expires_at=timezone.now() + timedelta(minutes=expires_in_minutes),
    )

    log_audit_event(
        event_type=PaymentAuditLog.EventType.INTENT_CREATED,
        message=f'Payment intent created: {email} for {purpose} ({amount})',
        intent=intent,
        ip_address=ip_address,
        user_agent=user_agent,
        severity='INFO',
    )

    return intent


def mark_intent_used(intent: PaymentIntent, transaction: PaymentTransaction) -> None:
    """Mark a payment intent as used."""
    intent.is_used = True
    intent.used_at = timezone.now()
    intent.transaction = transaction
    intent.save()

    log_audit_event(
        event_type=PaymentAuditLog.EventType.TX_INITIALIZED,
        message=f'Intent marked as used: {transaction.reference}',
        intent=intent,
        transaction=transaction,
        severity='INFO',
    )


def cleanup_expired_intents() -> int:
    """Remove expired payment intents. Run periodically via celery."""
    now = timezone.now()
    expired = PaymentIntent.objects.filter(
        expires_at__lte=now,
        is_used=False,
    )
    count = expired.count()

    for intent in expired:
        log_audit_event(
            event_type=PaymentAuditLog.EventType.INTENT_EXPIRED,
            message=f'Payment intent expired: {intent.email}',
            intent=intent,
            severity='INFO',
        )

    expired.delete()
    return count


# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Audit Log Helpers
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


def log_audit_event(
    event_type: str,
    message: str,
    transaction: Optional[PaymentTransaction] = None,
    intent: Optional[PaymentIntent] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    request_path: Optional[str] = None,
    request_method: Optional[str] = None,
    status_code: Optional[int] = None,
    response_data: Optional[dict] = None,
    error_details: Optional[str] = None,
    severity: str = 'INFO',
) -> PaymentAuditLog:
    """
    Log a payment event for audit trail.

    All payment operations create immutable audit logs for compliance,
    fraud detection, and debugging.

    Args:
        event_type: Type of event (from PaymentAuditLog.EventType)
        message: Human-readable message
        transaction: Associated PaymentTransaction
        intent: Associated PaymentIntent
        ip_address: Request source IP
        user_agent: Request user-agent
        request_path: API endpoint path
        request_method: HTTP method
        status_code: Response HTTP status
        response_data: Response payload
        error_details: Error message/traceback
        severity: Log severity level (INFO, WARNING, ERROR, CRITICAL)

    Returns:
        PaymentAuditLog instance
    """
    log = PaymentAuditLog.objects.create(
        event_type=event_type,
        message=message,
        transaction=transaction,
        intent=intent,
        ip_address=ip_address,
        user_agent=user_agent,
        request_path=request_path,
        request_method=request_method,
        status_code=status_code,
        response_data=response_data or {},
        error_details=error_details,
        severity=severity,
    )
    return log


def get_recent_audit_logs(
    transaction: Optional[PaymentTransaction] = None,
    intent: Optional[PaymentIntent] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    limit: int = 50,
) -> list:
    """Retrieve recent audit logs for analysis."""
    logs = PaymentAuditLog.objects.all()

    if transaction:
        logs = logs.filter(transaction=transaction)
    if intent:
        logs = logs.filter(intent=intent)
    if event_type:
        logs = logs.filter(event_type=event_type)
    if severity:
        logs = logs.filter(severity=severity)

    return logs.order_by('-created_at')[:limit]


def detect_fraud_indicators(email: str, time_window_minutes: int = 60) -> dict:
    """
    Detect potential fraud patterns.

    Returns:
        {
            'failed_attempts': count of failed verifications,
            'duplicate_intents': count of intents in time window,
            'high_amount_attempt': bool,
            'multiple_emails': count of unique IPs,
            'risk_level': 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
        }
    """
    now = timezone.now()
    window_start = now - timedelta(minutes=time_window_minutes)

    # Failed verification attempts
    failed_logs = PaymentAuditLog.objects.filter(
        event_type=PaymentAuditLog.EventType.TX_VERIFICATION_FAILED,
        intent__email=email,
        created_at__gte=window_start,
    ).count()

    # Duplicate intents (multiple attempts for same purpose)
    duplicate_intents = PaymentIntent.objects.filter(
        email=email,
        created_at__gte=window_start,
    ).count()

    # High-amount attempts
    high_amount = PaymentIntent.objects.filter(
        email=email,
        amount__gte=10000000,  # 100,000 in smallest unit
        created_at__gte=window_start,
    ).exists()

    # Multiple IPs from same email
    unique_ips = (
        PaymentAuditLog.objects.filter(
            intent__email=email,
            ip_address__isnull=False,
            created_at__gte=window_start,
        )
        .values('ip_address')
        .distinct()
        .count()
    )

    # Risk assessment
    risk_score = failed_logs + (duplicate_intents // 3) + (5 if high_amount else 0) + (unique_ips - 1)
    if risk_score >= 10:
        risk_level = 'CRITICAL'
    elif risk_score >= 7:
        risk_level = 'HIGH'
    elif risk_score >= 4:
        risk_level = 'MEDIUM'
    else:
        risk_level = 'LOW'

    return {
        'failed_attempts': failed_logs,
        'duplicate_intents': duplicate_intents,
        'high_amount_attempt': high_amount,
        'multiple_ips': unique_ips,
        'risk_level': risk_level,
        'risk_score': risk_score,
    }
