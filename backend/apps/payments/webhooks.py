"""Webhook processing logic for Paystack events."""

import logging
from typing import Any, Dict, Optional, Tuple

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction

from .exceptions import PaymentVerificationError, WebhookValidationError
from .models import PaymentStatus, PaymentTransaction, PaymentAuditLog
from .services import verify_transaction
from .signals import dispatch_payment_success
from .utils import parse_paid_at, safe_int, log_audit_event, validate_payment_amount

logger = logging.getLogger('payments')


def apply_verified_payment(
    reference: str,
    verification_data: Dict[str, Any],
    *,
    source: str,
) -> Tuple[Optional[PaymentTransaction], bool]:
    """Apply verified Paystack status to local transaction idempotently."""
    with transaction.atomic():
        payment = PaymentTransaction.objects.select_for_update().filter(reference=reference).first()
        if payment is None:
            logger.warning('Payment record not found during verification', extra={'reference': reference, 'source': source})
            return None, False

        if payment.status == PaymentStatus.SUCCESS:
            # Webhook duplicate — already processed
            logger.info('Payment already processed as success', extra={'reference': reference, 'source': source})
            log_audit_event(
                event_type=PaymentAuditLog.EventType.WEBHOOK_DUPLICATE,
                message=f'Duplicate webhook received (idempotent): {reference}',
                transaction=payment,
                severity='INFO',
            )
            return payment, False

        gateway_status = str(verification_data.get('status', '')).lower()
        if gateway_status == 'success':
            # Validate amount before marking as success
            verified_amount = safe_int(verification_data.get('amount'))
            try:
                payment_intent = payment.payment_intent
            except ObjectDoesNotExist:
                payment_intent = None
            amount_verified = False
            
            # Amount validation: critical for idempotency protection
            if payment_intent and verified_amount > 0:
                is_valid, error_msg = validate_payment_amount(
                    actual_amount=verified_amount,
                    expected_amount=payment_intent.amount,
                    tolerance_percent=0.0  # No tolerance for security
                )
                
                if not is_valid:
                    logger.error(
                        'Amount validation failed',
                        extra={
                            'reference': reference,
                            'error': error_msg,
                            'expected': payment_intent.amount,
                            'received': verified_amount
                        }
                    )
                    log_audit_event(
                        event_type=PaymentAuditLog.EventType.VALIDATION_ERROR,
                        transaction=payment,
                        message=f'Amount validation failed: {error_msg}',
                        severity='CRITICAL',
                    )
                    # Reject this payment
                    return None, False

                amount_verified = True

            # Mark amount as verified only when strict validation succeeds
            payment.amount_verified = amount_verified
            
            # Attempt state transition
            if not payment.transition_to(PaymentStatus.SUCCESS):
                logger.error('Illegal state transition', extra={'reference': reference, 'current': payment.status})
                return None, False
            
            payment.payment_method = verification_data.get('channel') or verification_data.get('payment_type')
            payment.gateway_response = verification_data.get('gateway_response') or verification_data.get('message')
            payment.paid_at = parse_paid_at(verification_data.get('paid_at'))

            if verified_amount > 0:
                payment.amount = verified_amount

            verified_currency = verification_data.get('currency')
            if isinstance(verified_currency, str) and verified_currency.strip():
                payment.currency = verified_currency

            metadata = payment.metadata or {}
            metadata['verification_source'] = source
            metadata['gateway_status'] = gateway_status
            metadata['amount_verified'] = amount_verified
            payment.metadata = metadata

            payment.save(
                update_fields=[
                    'status',
                    'payment_method',
                    'gateway_response',
                    'paid_at',
                    'amount',
                    'currency',
                    'amount_verified',
                    'metadata',
                    'updated_at',
                ]
            )

            # Log successful webhook processing
            log_audit_event(
                event_type=PaymentAuditLog.EventType.WEBHOOK_PROCESSED,
                message=f'Webhook processed successfully: {reference}',
                transaction=payment,
                response_data=verification_data,
                severity='INFO',
            )

            dispatch_payment_success(
                payment_transaction=payment,
                verification_data=verification_data,
                source=source,
            )
            return payment, True

        if gateway_status in {'failed', 'abandoned'}:
            if not payment.transition_to(PaymentStatus.FAILED):
                logger.error('Illegal state transition to FAILED', extra={'reference': reference, 'current': payment.status})
                return None, False
                
            payment.gateway_response = verification_data.get('gateway_response') or verification_data.get('message')
            payment.save(update_fields=['status', 'gateway_response', 'updated_at'])
            
            # Log failed payment
            log_audit_event(
                event_type=PaymentAuditLog.EventType.WEBHOOK_PROCESSED,
                message=f'Payment marked as failed: {reference}',
                transaction=payment,
                response_data=verification_data,
                severity='WARNING',
            )
            return payment, True

        logger.info(
            'Payment verification status not terminal, keeping pending',
            extra={'reference': reference, 'gateway_status': gateway_status, 'source': source},
        )
        return payment, False


def process_paystack_webhook(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Validate and process supported Paystack webhook events."""
    event = payload.get('event')
    if event != 'charge.success':
        logger.info('Ignoring unsupported webhook event', extra={'event': event})
        return {'processed': False, 'reason': 'unsupported_event'}

    event_data = payload.get('data')
    if not isinstance(event_data, dict):
        raise WebhookValidationError('Invalid webhook payload data')

    reference = event_data.get('reference')
    if not reference:
        raise WebhookValidationError('Webhook payload missing transaction reference')

    # Log webhook receipt
    try:
        payment = PaymentTransaction.objects.get(reference=reference)
        log_audit_event(
            event_type=PaymentAuditLog.EventType.WEBHOOK_RECEIVED,
            message=f'Webhook received for transaction: {reference}',
            transaction=payment,
            response_data=event_data,
            severity='INFO',
        )
    except PaymentTransaction.DoesNotExist:
        logger.warning('Webhook received for unknown transaction', extra={'reference': reference})

    try:
        verified_data = verify_transaction(reference)
        
        # Log webhook validation success
        try:
            payment = PaymentTransaction.objects.get(reference=reference)
            log_audit_event(
                event_type=PaymentAuditLog.EventType.WEBHOOK_VALIDATED,
                message=f'Webhook signature validated: {reference}',
                transaction=payment,
                response_data=verified_data,
                severity='INFO',
            )
        except PaymentTransaction.DoesNotExist:
            pass
            
    except PaymentVerificationError:
        logger.exception('Webhook verification call failed', extra={'reference': reference})
        raise

    payment, updated = apply_verified_payment(reference, verified_data, source='paystack_webhook')
    return {
        'processed': payment is not None,
        'updated': updated,
        'reference': reference,
    }
