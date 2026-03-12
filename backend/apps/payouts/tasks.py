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
