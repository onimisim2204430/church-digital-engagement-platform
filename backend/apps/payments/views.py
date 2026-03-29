"""API views for payment transaction lifecycle."""

import json
import logging
import os
from json import JSONDecodeError
from typing import Any, Dict

from django.db.models import Q
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .exceptions import (
    PaymentInitializationError,
    PaymentVerificationError,
    WebhookValidationError,
)
from .models import (
    PaymentStatus,
    PaymentTransaction,
    PaymentAuditLog,
    RecurringGivingPlan,
    RecurringPlanStatus,
)
from .services import initialize_transaction, verify_transaction
from .services import fetch_paystack_balance, initiate_refund
from .utils import (
    generate_payment_reference,
    safe_int,
    verify_paystack_signature,
    create_payment_intent,
    mark_intent_used,
    log_audit_event,
    detect_fraud_indicators,
)
from .monitoring import send_payment_alert, AlertSeverity
from .webhooks import apply_verified_payment, process_paystack_webhook

logger = logging.getLogger('payments')


def _serialize_recurring_plan(plan: RecurringGivingPlan) -> Dict[str, Any]:
    """Serialize recurring plan for member API responses."""
    title = plan.giving_title
    if not title and plan.giving_item is not None:
        title = plan.giving_item.title

    return {
        'id': str(plan.id),
        'email': plan.email,
        'giving_item_id': str(plan.giving_item_id) if plan.giving_item_id else None,
        'giving_title': title or 'General Fund',
        'amount': plan.amount,
        'currency': plan.currency,
        'frequency': plan.frequency,
        'frequency_label': plan.get_frequency_display(),
        'status': plan.status,
        'status_label': plan.get_status_display(),
        'next_payment_at': plan.next_payment_at.isoformat() if plan.next_payment_at else None,
        'last_payment_at': plan.last_payment_at.isoformat() if plan.last_payment_at else None,
        'started_at': plan.started_at.isoformat() if plan.started_at else None,
        'paused_at': plan.paused_at.isoformat() if plan.paused_at else None,
        'cancelled_at': plan.cancelled_at.isoformat() if plan.cancelled_at else None,
        'paystack_plan_code': plan.paystack_plan_code,
        'paystack_subscription_code': plan.paystack_subscription_code,
        'inferred_from_metadata': plan.inferred_from_metadata,
        'confidence_level': plan.confidence_level,
        'metadata': plan.metadata or {},
        'created_at': plan.created_at.isoformat() if plan.created_at else None,
        'updated_at': plan.updated_at.isoformat() if plan.updated_at else None,
    }


class MemberPaymentTransactionsView(APIView):
    """Return current authenticated member payment transactions."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs) -> Response:
        status_filter = str(request.query_params.get('status', '')).upper().strip()
        allowed_statuses = {choice for choice, _ in PaymentStatus.choices}

        queryset = PaymentTransaction.objects.filter(user=request.user).order_by('-created_at')
        if status_filter:
            if status_filter not in allowed_statuses:
                return Response(
                    {'status': 'error', 'message': 'Invalid status filter'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(status=status_filter)

        results = [
            {
                'id': str(transaction.id),
                'reference': transaction.reference,
                'amount': transaction.amount,
                'currency': transaction.currency,
                'status_label': transaction.get_status_display(),
                'status': transaction.status,
                'payment_method': transaction.payment_method,
                'amount_verified': transaction.amount_verified,
                'paid_at': transaction.paid_at.isoformat() if transaction.paid_at else None,
                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None,
                'metadata': transaction.metadata or {},
            }
            for transaction in queryset[:100]
        ]

        return Response(
            {'status': 'success', 'count': len(results), 'results': results},
            status=status.HTTP_200_OK,
        )


class MemberRecurringPlansView(APIView):
    """Return current authenticated member recurring giving plans."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs) -> Response:
        status_filter = str(request.query_params.get('status', '')).lower().strip()
        allowed_statuses = {choice for choice, _ in RecurringPlanStatus.choices}

        queryset = RecurringGivingPlan.objects.filter(user=request.user).select_related('giving_item').order_by('-updated_at')
        if status_filter:
            if status_filter not in allowed_statuses:
                return Response(
                    {'status': 'error', 'message': 'Invalid status filter'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(status=status_filter)

        plans = list(queryset[:100])
        results = [_serialize_recurring_plan(plan) for plan in plans]
        summary = {
            'active': len([p for p in plans if p.status == RecurringPlanStatus.ACTIVE]),
            'paused': len([p for p in plans if p.status == RecurringPlanStatus.PAUSED]),
            'cancelled': len([p for p in plans if p.status == RecurringPlanStatus.CANCELLED]),
        }

        return Response(
            {'status': 'success', 'count': len(results), 'summary': summary, 'results': results},
            status=status.HTTP_200_OK,
        )


class MemberRecurringPlanDetailView(APIView):
    """Return one recurring giving plan and related recurring payment history."""

    permission_classes = [IsAuthenticated]

    def get(self, request, plan_id: str, *args, **kwargs) -> Response:
        plan = (
            RecurringGivingPlan.objects.filter(user=request.user, id=plan_id)
            .select_related('giving_item', 'source_transaction')
            .first()
        )
        if plan is None:
            return Response(
                {'status': 'error', 'message': 'Recurring plan not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        recurring_flag_q = Q(metadata__recurring=True) | Q(metadata__recurring='true')
        history_filter = Q(metadata__recurring_plan_id=str(plan.id))

        if plan.source_transaction_id:
            history_filter |= Q(id=plan.source_transaction_id)

        if plan.giving_item_id:
            history_filter |= (Q(metadata__giving_option_id=str(plan.giving_item_id)) & recurring_flag_q)

        history_queryset = PaymentTransaction.objects.filter(user=request.user).filter(history_filter).order_by('-created_at')[:50]
        history = [
            {
                'id': str(tx.id),
                'reference': tx.reference,
                'amount': tx.amount,
                'currency': tx.currency,
                'status': tx.status,
                'status_label': tx.get_status_display(),
                'payment_method': tx.payment_method,
                'paid_at': tx.paid_at.isoformat() if tx.paid_at else None,
                'created_at': tx.created_at.isoformat() if tx.created_at else None,
                'metadata': tx.metadata or {},
            }
            for tx in history_queryset
        ]

        return Response(
            {
                'status': 'success',
                'plan': _serialize_recurring_plan(plan),
                'history_count': len(history),
                'history': history,
            },
            status=status.HTTP_200_OK,
        )


class InitializePaymentView(APIView):
    """Initialize a Paystack payment transaction."""

    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs) -> Response:
        """Create pending transaction and initialize Paystack checkout."""
        email = request.data.get('email')
        amount = safe_int(request.data.get('amount'))
        currency = str(request.data.get('currency', 'NGN')).upper()
        metadata = request.data.get('metadata') or {}
        callback_url = request.data.get('callback_url')
        reference = request.data.get('reference') or generate_payment_reference()
        intent_id = request.data.get('intent_id')  # Optional: client-supplied intent

        # Get request context for fraud detection
        ip_address = self._get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # Input Validation
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        if not email or amount <= 0:
            return Response(
                {'status': 'error', 'message': 'Valid email and amount are required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(metadata, dict):
            return Response(
                {'status': 'error', 'message': 'metadata must be a JSON object'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if PaymentTransaction.objects.filter(reference=reference).exists():
            return Response(
                {'status': 'error', 'message': 'reference already exists'},
                status=status.HTTP_409_CONFLICT,
            )

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # Fraud Detection
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        fraud_indicators = detect_fraud_indicators(email, time_window_minutes=60)
        if fraud_indicators['risk_level'] == 'CRITICAL':
            log_audit_event(
                event_type=PaymentAuditLog.EventType.FRAUD_DETECTED,
                message=f'Payment blocked due to critical fraud risk: {email}',
                ip_address=ip_address,
                user_agent=user_agent,
                severity='CRITICAL',
            )
            
            # Send alert to operations team
            send_payment_alert(
                severity=AlertSeverity.CRITICAL,
                title='Potential Fraud Detected',
                message=f'Payment attempt blocked for {email} due to high fraud risk',
                details={
                    'email': email,
                    'risk_level': fraud_indicators.get('risk_level'),
                    'indicators': fraud_indicators.get('indicators', []),
                    'ip_address': ip_address,
                }
            )
            
            return Response(
                {'status': 'error', 'message': 'Unable to process payment at this time'},
                status=status.HTTP_403_FORBIDDEN,
            )

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # Create or Validate Payment Intent
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        intent = None
        if intent_id:
            # Frontend provided an intent — validate it
            from .models import PaymentIntent
            try:
                intent = PaymentIntent.objects.get(id=intent_id, email=email)
                if not intent.can_use:
                    log_audit_event(
                        event_type=PaymentAuditLog.EventType.VALIDATION_ERROR,
                        message=f'Payment intent invalid or expired: {email}',
                        intent=intent,
                        ip_address=ip_address,
                        user_agent=user_agent,
                        severity='WARNING',
                    )
                    return Response(
                        {'status': 'error', 'message': 'Payment intent expired or already used'},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            except PaymentIntent.DoesNotExist:
                return Response(
                    {'status': 'error', 'message': 'Invalid payment intent'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        else:
            # Server creates intent
            intent = create_payment_intent(
                email=email,
                amount=amount,
                purpose=metadata.get('purpose', 'payment'),
                metadata=metadata,
                ip_address=ip_address,
                user_agent=user_agent,
            )

        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        # Create Transaction
        # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        payment = PaymentTransaction.objects.create(
            user=request.user if request.user.is_authenticated else None,
            email=email,
            amount=amount,
            currency=currency,
            reference=reference,
            status=PaymentStatus.PENDING,
            metadata=metadata,
        )

        # Link intent to transaction
        mark_intent_used(intent, payment)

        logger.info('Initializing payment', extra={'reference': reference, 'email': email, 'amount': amount})

        try:
            gateway_data = initialize_transaction(
                email=email,
                amount=amount,
                reference=reference,
                metadata=metadata,
                callback_url=callback_url,
            )
            # Successfully initialized with gateway → transition to PROCESSING
            if not payment.transition_to(PaymentStatus.PROCESSING):
                logger.error('Illegal state transition to PROCESSING', extra={'reference': reference})
                return Response(
                    {
                        'status': 'error',
                        'message': 'Unable to process payment at this time',
                        'reference': payment.reference,
                    },
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            payment.save(update_fields=['status', 'updated_at'])
        except PaymentInitializationError:
            logger.exception('Payment initialization error', extra={'reference': reference})
            log_audit_event(
                event_type=PaymentAuditLog.EventType.GATEWAY_ERROR,
                message=f'Payment initialization failed: {reference}',
                transaction=payment,
                severity='ERROR',
            )
            return Response(
                {
                    'status': 'error',
                    'message': 'Unable to initialize payment at this time',
                    'reference': payment.reference,
                    'payment_status': payment.status,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        response_payload: Dict[str, Any] = {
            'status': 'success',
            'reference': payment.reference,
            'authorization_url': gateway_data.get('authorization_url'),
            'access_code': gateway_data.get('access_code'),
            'payment_status': payment.status,
        }

        paystack_public_key = os.environ.get('PAYSTACK_PUBLIC_KEY')
        if paystack_public_key:
            response_payload['public_key'] = paystack_public_key

        return Response(response_payload, status=status.HTTP_201_CREATED)

    @staticmethod
    def _get_client_ip(request) -> str:
        """Extract client IP address from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', '')


class VerifyPaymentView(APIView):
    """Verify payment by reference."""

    permission_classes = [AllowAny]

    def get(self, request, reference: str, *args, **kwargs) -> Response:
        """Verify transaction with Paystack and update local record."""
        payment = PaymentTransaction.objects.filter(reference=reference).first()
        if payment is None:
            log_audit_event(
                event_type=PaymentAuditLog.EventType.VALIDATION_ERROR,
                message=f'Verification request for unknown transaction: {reference}',
                severity='WARNING',
            )
            return Response(
                {'status': 'error', 'message': 'Payment not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        logger.info('Verifying payment', extra={'reference': reference})

        try:
            verified_data = verify_transaction(reference)
        except PaymentVerificationError:
            logger.exception('Payment verification error', extra={'reference': reference})
            log_audit_event(
                event_type=PaymentAuditLog.EventType.TX_VERIFICATION_FAILED,
                message=f'Verification request failed: {reference}',
                transaction=payment,
                severity='ERROR',
            )
            return Response(
                {
                    'status': 'error',
                    'message': 'Unable to verify payment at this time',
                    'reference': reference,
                    'payment_status': payment.status,
                },
                status=status.HTTP_502_BAD_GATEWAY,
            )

        updated_payment, _ = apply_verified_payment(reference, verified_data, source='verify_endpoint')
        if updated_payment is None:
            return Response(
                {'status': 'error', 'message': 'Payment not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        updated_payment.refresh_from_db()
        return Response(
            {
                'status': 'success',
                'reference': updated_payment.reference,
                'payment_status': updated_payment.status,
                'paid_at': updated_payment.paid_at,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class PaystackWebhookView(APIView):
    """Receive and process Paystack webhook events."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs) -> Response:
        """Validate signature and process supported webhook events."""
        signature = request.headers.get('X-Paystack-Signature', '')
        if not verify_paystack_signature(request.body, signature):
            logger.warning('Webhook rejected due to invalid signature')
            log_audit_event(
                event_type=PaymentAuditLog.EventType.WEBHOOK_REJECTED,
                message='Webhook rejected: Invalid signature',
                severity='WARNING',
            )
            return Response(
                {'status': 'error', 'message': 'Invalid signature'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            payload = json.loads(request.body.decode('utf-8'))
        except (UnicodeDecodeError, JSONDecodeError):
            logger.warning('Webhook payload parsing failed')
            log_audit_event(
                event_type=PaymentAuditLog.EventType.VALIDATION_ERROR,
                message='Webhook rejected: Invalid JSON payload',
                severity='WARNING',
            )
            return Response(
                {'status': 'error', 'message': 'Invalid payload'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = process_paystack_webhook(payload)
        except WebhookValidationError as exc:
            logger.warning('Webhook validation failed', extra={'message': str(exc)})
            log_audit_event(
                event_type=PaymentAuditLog.EventType.WEBHOOK_REJECTED,
                message=f'Webhook rejected: {str(exc)}',
                severity='WARNING',
            )
            return Response(
                {'status': 'error', 'message': str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except PaymentVerificationError:
            logger.exception('Webhook verification failed')
            log_audit_event(
                event_type=PaymentAuditLog.EventType.NETWORK_ERROR,
                message='Webhook verification error - retrying pending',
                severity='ERROR',
            )
            return Response(
                {'status': 'accepted', 'message': 'Webhook received; verification pending'},
                status=status.HTTP_202_ACCEPTED,
            )
        except Exception:
            logger.exception('Unhandled webhook processing error')
            log_audit_event(
                event_type=PaymentAuditLog.EventType.GATEWAY_ERROR,
                message='Webhook processing error - received and queued',
                severity='ERROR',
            )
            return Response(
                {'status': 'accepted', 'message': 'Webhook received'},
                status=status.HTTP_202_ACCEPTED,
            )

        return Response({'status': 'ok', 'result': result}, status=status.HTTP_200_OK)


class AdminPaymentTransactionsView(APIView):
    """Return all payment transactions. Requires fin.payments module permission."""

    def get_permissions(self):
        from apps.users.permissions import HasModulePermission
        return [HasModulePermission('fin.payments')]

    def get(self, request, *args, **kwargs) -> Response:

        status_filter = str(request.query_params.get('status', '')).upper().strip()
        allowed_statuses = {choice for choice, _ in PaymentStatus.choices}

        queryset = PaymentTransaction.objects.select_related('user').order_by('-created_at')
        
        if status_filter:
            if status_filter not in allowed_statuses:
                return Response(
                    {'status': 'error', 'message': 'Invalid status filter'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            queryset = queryset.filter(status=status_filter)

        results = [
            {
                'id': str(transaction.id),
                'reference': transaction.reference,
                'amount': transaction.amount,
                'currency': transaction.currency,
                'status_label': transaction.get_status_display(),
                'status': transaction.status,
                'payment_method': transaction.payment_method,
                'amount_verified': transaction.amount_verified,
                'paid_at': transaction.paid_at.isoformat() if transaction.paid_at else None,
                'created_at': transaction.created_at.isoformat() if transaction.created_at else None,
                'updated_at': transaction.updated_at.isoformat() if transaction.updated_at else None,
                'metadata': transaction.metadata or {},
                # Prefer authenticated user record; fall back to metadata provided at checkout
                'user_email': (
                    transaction.user.email if transaction.user
                    else (transaction.metadata or {}).get('email') or transaction.email or 'N/A'
                ),
                'user_name': (
                    f"{transaction.user.first_name} {transaction.user.last_name}".strip()
                    if transaction.user and (transaction.user.first_name or transaction.user.last_name)
                    else " ".join([
                        str((transaction.metadata or {}).get('first_name', '')).strip(),
                        str((transaction.metadata or {}).get('last_name', '')).strip(),
                    ]).strip() or 'N/A'
                ),
            }
            for transaction in queryset[:500]
        ]

        return Response(
            {'status': 'success', 'count': len(results), 'results': results},
            status=status.HTTP_200_OK,
        )


class AdminPaystackBalanceView(APIView):
    """Return current Paystack NGN wallet balance (kobo)."""

    def get_permissions(self):
        from apps.users.permissions import HasModulePermission
        return [HasModulePermission('fin.payments')]

    def get(self, request, *args, **kwargs) -> Response:
        try:
            balance = fetch_paystack_balance()
        except PaymentVerificationError as exc:
            return Response(
                {'status': 'error', 'message': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response({'balance': balance}, status=status.HTTP_200_OK)


class AdminTransactionRefundView(APIView):
    """Initiate Paystack refund for a successful transaction."""

    def get_permissions(self):
        from apps.users.permissions import HasModulePermission
        return [HasModulePermission('fin.payments')]

    def post(self, request, transaction_id: str, *args, **kwargs) -> Response:
        payment = PaymentTransaction.objects.filter(id=transaction_id).first()
        if payment is None:
            return Response(
                {'status': 'error', 'message': 'Transaction not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        if payment.status != PaymentStatus.SUCCESS:
            return Response(
                {'status': 'error', 'message': 'Only successful transactions can be refunded'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if bool((payment.metadata or {}).get('refund_initiated')):
            return Response({'status': 'ok'}, status=status.HTTP_200_OK)

        try:
            gateway_result = initiate_refund(payment.reference)
        except PaymentVerificationError as exc:
            return Response(
                {'status': 'error', 'message': str(exc)},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        metadata = dict(payment.metadata or {})
        metadata['refund_initiated'] = True
        metadata['refund_data'] = gateway_result.get('data', {})
        payment.metadata = metadata
        payment.save(update_fields=['metadata', 'updated_at'])

        return Response({'status': 'ok'}, status=status.HTTP_200_OK)
