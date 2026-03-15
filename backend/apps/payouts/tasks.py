import json
import time
import requests

from celery import shared_task
from celery.utils.log import get_task_logger
from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.payouts.models import WithdrawalRequest, PayoutTransaction
from apps.payouts.services.payout_engine import PayoutEngine

logger = get_task_logger(__name__)


def _is_transient_message(message: str) -> bool:
    """Heuristic check for transient failures worth retrying."""
    if not message:
        return False
    lowered = str(message).lower()
    transient_tokens = [
        'system error',
        'timeout',
        'timed out',
        'connection',
        'temporar',
    ]
    return any(token in lowered for token in transient_tokens)


@shared_task(bind=True, max_retries=5, default_retry_delay=60)
def process_withdrawal_task(self, withdrawal_id):
    """
    Background task to process a withdrawal via PayoutEngine.

    Safety and idempotency notes:
    - Always lock the withdrawal row using select_for_update inside transaction.atomic.
    - Task can be called multiple times for the same withdrawal safely via status checks.
    - Uses retry only for transient errors with exponential backoff.
    - TODO: Add reconciliation fallback with PaystackService.verify_transfer if webhook is not received within X minutes.
    """
    if not getattr(settings, 'PAYSTACK_SECRET_KEY', None):
        logger.warning('PAYSTACK_SECRET_KEY is not configured; payout processing may fail')

    started_at = time.time()
    try:
        with transaction.atomic():
            try:
                withdrawal = WithdrawalRequest.objects.select_for_update().select_related('bank_account').get(
                    id=withdrawal_id
                )
            except WithdrawalRequest.DoesNotExist:
                logger.warning('Withdrawal not found; skipping task', extra={'withdrawal_id': str(withdrawal_id)})
                return {
                    'status': False,
                    'transaction_id': None,
                    'message': 'Withdrawal not found',
                }

            logger.info(
                'Idempotent withdrawal task start',
                extra={'withdrawal_id': str(withdrawal.id), 'status': withdrawal.status},
            )

            if withdrawal.status == 'completed':
                existing_tx = PayoutTransaction.objects.filter(withdrawal=withdrawal).first()
                return {
                    'status': True,
                    'transaction_id': str(existing_tx.id) if existing_tx else None,
                    'message': 'Withdrawal already completed',
                }

            if withdrawal.status in ['failed', 'cancelled']:
                return {
                    'status': False,
                    'transaction_id': None,
                    'message': f'Cannot process withdrawal in {withdrawal.status} state',
                }

            if withdrawal.status not in ['approved', 'processing']:
                return {
                    'status': False,
                    'transaction_id': None,
                    'message': f'Withdrawal not ready for processing. Current status: {withdrawal.status}',
                }

            # Keep explicit processing state for workers/observers.
            withdrawal.status = 'processing'
            withdrawal.updated_at = timezone.now()
            withdrawal.save(update_fields=['status', 'updated_at'])

            # PayoutEngine expects an approved object state before execution.
            withdrawal.status = 'approved'

            engine = PayoutEngine()
            result = engine.process_withdrawal(withdrawal)

            if result.get('status'):
                logger.info(
                    'Withdrawal task completed',
                    extra={
                        'withdrawal_id': str(withdrawal.id),
                        'transaction_id': result.get('transaction_id'),
                        'duration_sec': round(time.time() - started_at, 3),
                    },
                )
                return result

            message = str(result.get('message') or '')
            if _is_transient_message(message):
                countdown = min(2 ** self.request.retries * 60, 3600)
                logger.warning(
                    'Transient payout failure; scheduling retry',
                    extra={
                        'withdrawal_id': str(withdrawal.id),
                        'retry': self.request.retries + 1,
                        'countdown': countdown,
                        'error_msg': message,
                    },
                )
                raise self.retry(countdown=countdown, exc=Exception(message))

            # Permanent failure path, no retry.
            withdrawal.status = 'failed'
            withdrawal.failure_reason = (message or 'Permanent payout failure')[:2000]
            withdrawal.updated_at = timezone.now()
            withdrawal.save(update_fields=['status', 'failure_reason', 'updated_at'])
            logger.error(
                'Permanent payout failure; stopping retries',
                extra={'withdrawal_id': str(withdrawal.id), 'error_msg': message},
            )
            return {
                'status': False,
                'transaction_id': None,
                'message': message or 'Permanent payout failure',
            }

    except Exception as exc:
        error_text = str(exc)
        is_transient = _is_transient_message(error_text) or isinstance(exc, requests.exceptions.RequestException)

        if is_transient and self.request.retries < self.max_retries:
            countdown = min(2 ** self.request.retries * 60, 3600)
            logger.warning(
                'Task exception considered transient; retrying',
                extra={
                    'withdrawal_id': str(withdrawal_id),
                    'retry': self.request.retries + 1,
                    'countdown': countdown,
                    'error': error_text,
                },
                exc_info=True,
            )
            raise self.retry(countdown=countdown, exc=exc)

        with transaction.atomic():
            withdrawal = WithdrawalRequest.objects.select_for_update().filter(id=withdrawal_id).first()
            if withdrawal and withdrawal.status not in ['completed', 'failed', 'cancelled']:
                withdrawal.status = 'failed'
                details = {'error': error_text, 'retries': self.request.retries}
                withdrawal.failure_reason = json.dumps(details)[:2000]
                withdrawal.updated_at = timezone.now()
                withdrawal.save(update_fields=['status', 'failure_reason', 'updated_at'])

        logger.error(
            'Task finished with permanent exception state',
            extra={'withdrawal_id': str(withdrawal_id), 'error': error_text},
            exc_info=True,
        )
        return {
            'status': False,
            'transaction_id': None,
            'message': error_text or 'Withdrawal processing failed',
        }


# Tests to create later:
# - Unit tests for task retry policy with mocked PayoutEngine (transient vs permanent failures).
# - Integration test to confirm admin approve enqueues process_withdrawal_task asynchronously.


# Paystack's effective SLA: any transfer not finalised within 30 minutes is stuck.
STALE_MINUTES = 30


@shared_task
def expire_stale_withdrawals():
    """
    Periodic task (runs every 5 min via Celery Beat): mark withdrawals stuck
    in 'processing' or 'otp_required' for more than STALE_MINUTES as 'failed'.

    Scenarios covered:
     1. Paystack transfer initiated but webhook never arrived in time.
     2. OTP was sent but never entered — the OTP window has now expired.

    Safe/idempotent — uses select_for_update to avoid concurrent races.
    """
    from datetime import timedelta
    cutoff = timezone.now() - timedelta(minutes=STALE_MINUTES)
    stale_qs = WithdrawalRequest.objects.filter(
        status__in=['processing', 'otp_required'],
        updated_at__lt=cutoff,
    )
    count = 0
    for w in stale_qs:
        with transaction.atomic():
            locked = WithdrawalRequest.objects.select_for_update().filter(
                id=w.id, status__in=['processing', 'otp_required']
            ).first()
            if locked is None:
                continue
            original_status = locked.status
            locked.status = 'failed'
            locked.failure_reason = (
                f'Timed out — no Paystack confirmation received within {STALE_MINUTES} minutes '
                f'(previous status: {original_status}). '
                'If funds were deducted, contact Paystack support with the transfer reference.'
            )
            locked.updated_at = timezone.now()
            locked.save(update_fields=['status', 'failure_reason', 'updated_at'])
            count += 1

    if count:
        logger.info('expire_stale_withdrawals: expired %d stale withdrawal(s)', count)
    return {'expired': count}


# ============================================================================
# Withdrawal Notification & Email Tasks
# ============================================================================

@shared_task
def send_withdrawal_notification_and_email(withdrawal_id, status_after_processing):
    """
    Send email and in-app notification to user when withdrawal status changes.
    
    Called after withdrawal processing is complete to notify user of final status.
    Handles both success and failure scenarios with appropriate templates.
    
    Args:
        withdrawal_id: UUID of WithdrawalRequest
        status_after_processing: Final status ('completed', 'otp_required', 'failed', etc.)
    """
    from apps.email.services import EmailService
    from apps.email.constants import EmailType
    from apps.notifications.models import Notification
    from apps.notifications.constants import NotificationType, NotificationPriority, SourceModule
    from django.contrib.auth import get_user_model
    
    User = get_user_model()
    
    try:
        withdrawal = WithdrawalRequest.objects.select_related('user', 'bank_account').get(id=withdrawal_id)
    except WithdrawalRequest.DoesNotExist:
        logger.warning(f'Withdrawal {withdrawal_id} not found for notification')
        return False
    
    user = withdrawal.user
    bank_account = withdrawal.bank_account
    
    # Prepare context data for templates
    context = {
        'user_first_name': user.first_name or user.email.split('@')[0],
        'user_full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
        'user_email': user.email,
        'church_name': 'Church Digital Platform',
        'withdrawal_reference': withdrawal.reference,
        'amount': withdrawal.amount,
        'currency': withdrawal.currency,
        'account_name': bank_account.account_name,
        'account_number_masked': f"***{bank_account.account_number[-4:]}",
        'bank_name': bank_account.bank_name,
        'requested_at': withdrawal.requested_at,
        'approved_at': withdrawal.approved_at,
        'completed_at': withdrawal.processed_at,
        'failure_reason': withdrawal.failure_reason or 'System error',
    }
    
    # Add transfer code if available
    if hasattr(withdrawal, 'transaction') and withdrawal.transaction:
        context['transfer_code'] = withdrawal.transaction.paystack_transfer_code or 'N/A'
    
    email_sent = False
    notification_created = False
    
    try:
        # Determine template and notification based on status
        if status_after_processing == 'completed':
            template_slug = 'withdrawal_completed'
            notification_type = NotificationType.WITHDRAWAL_COMPLETED
            notification_title = 'Withdrawal Completed'
            notification_message = f'Your withdrawal of ₦{withdrawal.amount} has been completed successfully.'
            priority = NotificationPriority.HIGH
            
        elif status_after_processing == 'otp_required':
            template_slug = 'withdrawal_otp_required'
            notification_type = NotificationType.WITHDRAWAL_OTP_REQUIRED
            notification_title = 'OTP Required for Withdrawal'
            notification_message = f'Your withdrawal of ₦{withdrawal.amount} requires OTP confirmation.'
            priority = NotificationPriority.HIGH
            
        elif status_after_processing == 'failed':
            template_slug = 'withdrawal_failed'
            notification_type = NotificationType.WITHDRAWAL_FAILED
            notification_title = 'Withdrawal Failed'
            notification_message = f'Your withdrawal of ₦{withdrawal.amount} could not be processed.'
            priority = NotificationPriority.HIGH
            
        elif status_after_processing == 'approved':
            template_slug = 'withdrawal_approved_user'
            notification_type = NotificationType.WITHDRAWAL_APPROVED
            notification_title = 'Withdrawal Approved'
            notification_message = f'Your withdrawal of ₦{withdrawal.amount} has been approved.'
            priority = NotificationPriority.MEDIUM
            
        else:
            logger.warning(f'Unknown withdrawal status {status_after_processing}')
            return False
        
        # Send email using template
        logger.info(f'Sending email template "{template_slug}" to {user.email}')
        EmailService.send_email(
            to_email=user.email,
            to_name=user.get_full_name() or user.email,
            template_slug=template_slug,
            context=context,
            email_type=EmailType.TRANSACTIONAL,
            user=user,
        )
        email_sent = True
        logger.info(f'✓ Email sent for withdrawal {withdrawal.reference}')
        
    except Exception as e:
        logger.error(f'Failed to send email for withdrawal {withdrawal.reference}: {str(e)}', exc_info=True)
        # Continue to create notification even if email fails
    
    try:
        # Create in-app notification
        logger.info(f'Creating notification for withdrawal {withdrawal.reference}')
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=notification_title,
            message=notification_message,
            priority=priority,
            source_module=SourceModule.PAYMENT,
            metadata={
                'withdrawal_id': str(withdrawal.id),
                'withdrawal_reference': withdrawal.reference,
                'amount': str(withdrawal.amount),
                'status': status_after_processing,
            }
        )
        notification_created = True
        logger.info(f'✓ Notification created: {notification.id}')
        
    except Exception as e:
        logger.error(f'Failed to create notification for withdrawal {withdrawal.reference}: {str(e)}', exc_info=True)
    
    return email_sent or notification_created


@shared_task
def send_withdrawal_admin_notification(withdrawal_id, status):
    """
    Send email to admin when withdrawal status changes.
    
    Notifies admins of:
    - New pending withdrawal requests (pending)
    - Completed withdrawals (completed)
    - Failed withdrawals (failed)
    
    Args:
        withdrawal_id: UUID of WithdrawalRequest
        status: Current status of withdrawal
    """
    from apps.email.services import EmailService
    from apps.email.constants import EmailType
    from django.contrib.auth import get_user_model
    from apps.users.models import UserRole
    
    User = get_user_model()
    
    try:
        withdrawal = WithdrawalRequest.objects.select_related('user', 'bank_account').get(id=withdrawal_id)
    except WithdrawalRequest.DoesNotExist:
        logger.warning(f'Withdrawal {withdrawal_id} not found for admin notification')
        return False
    
    user = withdrawal.user
    bank_account = withdrawal.bank_account
    
    # Get admin users (ADMIN, MODERATOR roles)
    admins = User.objects.filter(
        role__in=[UserRole.ADMIN, UserRole.MODERATOR],
        is_active=True
    )
    
    if not admins.exists():
        logger.warning('No active admins found for withdrawal notification')
        return False
    
    # Prepare context
    context = {
        'user_full_name': f"{user.first_name} {user.last_name}".strip() or user.email,
        'user_email': user.email,
        'withdrawal_reference': withdrawal.reference,
        'amount': withdrawal.amount,
        'currency': withdrawal.currency,
        'account_name': bank_account.account_name,
        'account_number_masked': f"***{bank_account.account_number[-4:]}",
        'bank_name': bank_account.bank_name,
        'requested_at': withdrawal.requested_at,
        'admin_approval_url': f'/admin/payouts/withdrawalrequest/{withdrawal.id}/change/',
    }
    
    # Add transfer code if available
    if hasattr(withdrawal, 'transaction') and withdrawal.transaction:
        context['transfer_code'] = withdrawal.transaction.paystack_transfer_code or 'N/A'
        context['completed_at'] = withdrawal.processed_at
    
    sent_count = 0
    
    # Determine template based on status
    if status == 'pending':
        template_slug = 'withdrawal_admin_notification'
    elif status == 'completed':
        template_slug = 'withdrawal_admin_completed'
        context['completed_at'] = withdrawal.processed_at
    else:
        logger.debug(f'Skipping admin notification for withdrawal status: {status}')
        return False
    
    # Send to all admins
    for admin in admins:
        try:
            logger.info(f'Sending admin notification to {admin.email}')
            EmailService.send_email(
                to_email=admin.email,
                to_name=admin.get_full_name() or admin.email,
                template_slug=template_slug,
                context=context,
                email_type=EmailType.NOTIFICATION,
                user=admin,
            )
            sent_count += 1
            logger.info(f'✓ Admin notification sent to {admin.email}')
            
        except Exception as e:
            logger.error(f'Failed to send admin notification to {admin.email}: {str(e)}', exc_info=True)
    
    return sent_count > 0

