"""Celery background tasks for payment processing and monitoring."""

import logging
from datetime import timedelta
from typing import Dict, Any

from celery import shared_task
from django.utils import timezone
from .models import PaymentIntent, PaymentTransaction, PaymentStatus, PaymentAuditLog
from .services import verify_transaction
from .exceptions import PaymentVerificationError
from .utils import log_audit_event
from .monitoring import send_payment_alert, AlertSeverity

logger = logging.getLogger('payments')


@shared_task(
    name='payments.cleanup_expired_intents',
    max_retries=3,
    default_retry_delay=300,
    bind=True,
)
def cleanup_expired_intents(self) -> Dict[str, Any]:
    """Clean up expired payment intents hourly.
    
    This prevents stale intents from accumulating in the database.
    Runs: Every hour (configured in settings.CELERY_BEAT_SCHEDULE)
    
    Returns:
        Dict with {
            'deleted_count': number of intents deleted,
            'timestamp': when cleanup ran
        }
    """
    try:
        now = timezone.now()
        expired_intents = PaymentIntent.objects.filter(
            expires_at__lt=now,
            is_used=False
        )
        
        deleted_count = 0
        for intent in expired_intents:
            # Log expiration before deletion
            log_audit_event(
                event_type=PaymentAuditLog.EventType.INTENT_EXPIRED,
                message=f'Payment intent expired: {intent.email}',
                intent=intent,
                severity='INFO',
            )
            deleted_count += 1
        
        # Delete all at once for efficiency
        expired_intents.delete()
        
        logger.info(
            'Expired payment intents cleaned up',
            extra={'count': deleted_count, 'timestamp': now.isoformat()}
        )
        
        return {
            'deleted_count': deleted_count,
            'timestamp': now.isoformat(),
            'status': 'success',
        }
    except Exception as exc:
        logger.exception('Error during expired intent cleanup')
        raise self.retry(exc=exc, countdown=60)


@shared_task(
    name='payments.verify_pending_transactions',
    max_retries=3,
    default_retry_delay=300,
)
def verify_pending_transactions() -> Dict[str, Any]:
    """Verify pending transactions with Paystack every 10 minutes.
    
    This is a safety net in case webhooks fail or are delayed.
    For transactions stuck in PROCESSING state for too long.
    
    Runs: Every 10 minutes (configured in settings.CELERY_BEAT_SCHEDULE)
    
    Returns:
        Dict with {
            'checked_count': number of transactions checked,
            'updated_count': number of transactions updated,
            'failed_count': number that failed verification,
            'timestamp': when verification ran
        }
    """
    try:
        now = timezone.now()
        five_minutes_ago = now - timedelta(minutes=5)
        
        # Find transactions that have been PROCESSING for more than 5 minutes
        # This indicates a potential webhook failure
        pending_txns = PaymentTransaction.objects.filter(
            status=PaymentStatus.PROCESSING,
            updated_at__lt=five_minutes_ago
        )[:100]  # Limit to 100 per run to avoid overload
        
        checked_count = len(list(pending_txns))
        updated_count = 0
        failed_count = 0
        
        for txn in pending_txns:
            try:
                # Ask Paystack API to verify this transaction
                verification_data = verify_transaction(txn.reference)
                gateway_status = str(verification_data.get('status', '')).lower()
                
                # Apply the verified status locally
                if gateway_status == 'success':
                    # Check if we already logged success (idempotency)
                    if txn.status != PaymentStatus.SUCCESS:
                        txn.status = PaymentStatus.SUCCESS
                        txn.paid_at = timezone.now()
                        txn.save(update_fields=['status', 'paid_at', 'updated_at'])
                        
                        log_audit_event(
                            event_type=PaymentAuditLog.EventType.TX_VERIFICATION_SUCCESS,
                            message=f'Pending transaction verified as success: {txn.reference}',
                            transaction=txn,
                            severity='INFO',
                        )
                        updated_count += 1
                        
                elif gateway_status in {'failed', 'abandoned'}:
                    if txn.status != PaymentStatus.FAILED:
                        txn.status = PaymentStatus.FAILED
                        txn.gateway_response = verification_data.get('message', 'Payment failed')
                        txn.save(update_fields=['status', 'gateway_response', 'updated_at'])
                        
                        log_audit_event(
                            event_type=PaymentAuditLog.EventType.TX_VERIFICATION_FAILED,
                            message=f'Pending transaction verified as failed: {txn.reference}',
                            transaction=txn,
                            severity='WARNING',
                        )
                        updated_count += 1
                        
            except PaymentVerificationError as exc:
                logger.warning(
                    'Failed to verify pending transaction',
                    extra={'reference': txn.reference, 'error': str(exc)}
                )
                failed_count += 1
                log_audit_event(
                    event_type=PaymentAuditLog.EventType.TX_VERIFICATION_FAILED,
                    message=f'Verification error for pending transaction: {txn.reference}',
                    transaction=txn,
                    error_details=str(exc),
                    severity='WARNING',
                )
        
        logger.info(
            'Pending transactions verified',
            extra={
                'checked': checked_count,
                'updated': updated_count,
                'failed': failed_count,
                'timestamp': now.isoformat()
            }
        )
        
        return {
            'checked_count': checked_count,
            'updated_count': updated_count,
            'failed_count': failed_count,
            'timestamp': now.isoformat(),
            'status': 'success',
        }
    except Exception as exc:
        logger.exception('Error during pending transaction verification')
        # Retry on unexpected errors
        raise


@shared_task(
    name='payments.check_critical_errors',
    max_retries=2,
    default_retry_delay=600,
)
def check_critical_errors() -> Dict[str, Any]:
    """Check for critical payment errors and alert operations team.
    
    Runs: Every 15 minutes (configured in settings.CELERY_BEAT_SCHEDULE)
    
    Checks for:
    - Multiple FAILED transactions from same email (fraud indicator)
    - Transactions stuck in PROCESSING for >1 hour
    - Recent Critical/Error audit logs
    
    Returns:
        Dict with {
            'critical_issues_found': number of critical issues,
            'alerts_sent': number of alerts sent,
            'timestamp': when check ran
        }
    """
    try:
        now = timezone.now()
        one_hour_ago = now - timedelta(hours=1)
        critical_issues = []
        
        # Check for recent critical audit logs
        critical_events = PaymentAuditLog.objects.filter(
            severity__in=['CRITICAL', 'ERROR'],
            created_at__gte=one_hour_ago
        ).count()
        
        if critical_events > 5:
            critical_issues.append(
                f'{critical_events} critical/error events in last hour'
            )
        
        # Check for transactions stuck in PROCESSING > 1 hour
        stuck_txns = PaymentTransaction.objects.filter(
            status=PaymentStatus.PROCESSING,
            updated_at__lt=one_hour_ago
        ).count()
        
        if stuck_txns > 0:
            critical_issues.append(
                f'{stuck_txns} transactions stuck in PROCESSING for >1 hour'
            )
        
        # Check for fraud patterns (multiple failed from same email in 30 mins)
        thirty_mins_ago = now - timedelta(minutes=30)
        from django.db.models import Count
        suspicious_emails = PaymentTransaction.objects.filter(
            status=PaymentStatus.FAILED,
            created_at__gte=thirty_mins_ago
        ).values('email').annotate(count=Count('id')).filter(count__gte=3)
        
        for entry in suspicious_emails:
            critical_issues.append(
                f"Email {entry['email']} has {entry['count']} failed payments in 30 mins"
            )
        
        # If critical issues found, log them at CRITICAL level
        if critical_issues:
            for issue in critical_issues:
                log_audit_event(
                    event_type=PaymentAuditLog.EventType.FRAUD_DETECTED,
                    message=f'Critical payment issue detected: {issue}',
                    severity='CRITICAL',
                )
            
            logger.critical(
                'Critical payment errors detected',
                extra={'issues': critical_issues}
            )
            
            # Send alerts to operators via configured channels (Slack, Email, etc)
            send_payment_alert(
                severity=AlertSeverity.CRITICAL,
                title='Critical Payment System Issues Detected',
                message='Multiple critical issues detected in payment processing',
                details={
                    'issue_count': len(critical_issues),
                    'issues': critical_issues,
                    'check_timestamp': now.isoformat(),
                }
            )
        
        return {
            'critical_issues_found': len(critical_issues),
            'issues': critical_issues,
            'timestamp': now.isoformat(),
            'status': 'success',
        }
    except Exception as exc:
        logger.exception('Error during critical error check')
        raise
