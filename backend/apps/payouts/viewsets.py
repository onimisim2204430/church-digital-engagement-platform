import logging

from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.payouts.models import BankAccount, WithdrawalRequest
from apps.payouts.paystack import confirm_transfer_otp, verify_transfer_status
from apps.payouts.serializers import (
    AdminWithdrawalApproveSerializer,
    BankAccountSerializer,
    WithdrawalRequestSerializer,
)
from apps.payouts.views import enqueue_withdrawal
from apps.users.permissions import IsAdmin

logger = logging.getLogger(__name__)


class WithdrawalViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """User withdrawal actions: submit and list own withdrawals."""

    serializer_class = WithdrawalRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WithdrawalRequest.objects.filter(user=self.request.user).order_by('-requested_at')

    @action(detail=False, methods=['get', 'post'], url_path='bank-accounts')
    def bank_accounts(self, request):
        if request.method.lower() == 'post':
            serializer = BankAccountSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            account_number = serializer.validated_data.get('account_number')
            bank_code = serializer.validated_data.get('bank_code')
            account_name = serializer.validated_data.get('account_name')
            bank_name = serializer.validated_data.get('bank_name')

            bank_account, created = BankAccount.objects.get_or_create(
                user=request.user,
                account_number=account_number,
                bank_code=bank_code,
                defaults={
                    'account_name': account_name,
                    'bank_name': bank_name,
                    'is_verified': False,
                },
            )

            if not created:
                # Keep account details fresh if same account/bank code is reused.
                changed = False
                if bank_account.account_name != account_name:
                    bank_account.account_name = account_name
                    changed = True
                if bank_account.bank_name != bank_name:
                    bank_account.bank_name = bank_name
                    changed = True
                if changed:
                    bank_account.save(update_fields=['account_name', 'bank_name', 'updated_at'])

            return Response(
                BankAccountSerializer(bank_account).data,
                status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
            )

        accounts = BankAccount.objects.filter(user=request.user).order_by('-created_at')
        serializer = BankAccountSerializer(accounts, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=['post'], url_path='finalize-otp')
    def finalize_otp(self, request, pk=None):
        withdrawal = self.get_object()
        otp = str(request.data.get('otp', '')).strip()
        transfer_code = str(request.data.get('transfer_code', '')).strip()

        if not otp:
            return Response({'detail': 'OTP is required'}, status=status.HTTP_400_BAD_REQUEST)

        if withdrawal.status not in ['otp_required', 'processing']:
            return Response(
                {'detail': f'Withdrawal is not awaiting OTP. Current status: {withdrawal.status}'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        tx = getattr(withdrawal, 'transaction', None)
        if tx is None:
            return Response({'detail': 'Payout transaction not found'}, status=status.HTTP_404_NOT_FOUND)

        if not transfer_code:
            transfer_code = str(tx.paystack_transfer_code or '').strip()
        if not transfer_code:
            return Response({'detail': 'Transfer code not found for this withdrawal'}, status=status.HTTP_400_BAD_REQUEST)

        ok, _, message = confirm_transfer_otp(transfer_code, otp)
        if not ok:
            return Response({'detail': message}, status=status.HTTP_400_BAD_REQUEST)

        # OTP accepted — immediately verify real Paystack transfer status to give
        # the frontend an accurate final state without waiting for a webhook.
        _, paystack_status, _ = verify_transfer_status(transfer_code)

        final_withdrawal_status = 'processing'  # default; webhook will confirm later
        if str(paystack_status).lower() == 'success':
            final_withdrawal_status = 'completed'

        if final_withdrawal_status == 'completed':
            withdrawal.status = 'completed'
            if not withdrawal.processed_at:
                withdrawal.processed_at = timezone.now()
            withdrawal.updated_at = timezone.now()
            withdrawal.save(update_fields=['status', 'processed_at', 'updated_at'])
            tx.status = 'success'
        else:
            withdrawal.status = 'processing'
            withdrawal.updated_at = timezone.now()
            withdrawal.save(update_fields=['status', 'updated_at'])

        payload = tx.response_payload if isinstance(tx.response_payload, dict) else {}
        payload['otp_finalize'] = {
            'status': 'ok',
            'message': message,
            'paystack_transfer_status': paystack_status,
        }
        tx.response_payload = payload
        tx.save(update_fields=['status', 'response_payload'])

        return Response({
            'status': 'ok',
            'message': message,
            'withdrawal_status': final_withdrawal_status,
            'paystack_transfer_status': paystack_status,
        }, status=status.HTTP_200_OK)


class AdminWithdrawalViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Admin withdrawal actions: view all and approve withdrawals."""

    permission_classes = [IsAdmin]
    queryset = WithdrawalRequest.objects.select_related('user', 'bank_account', 'transaction').all().order_by('-requested_at')

    serializer_class = AdminWithdrawalApproveSerializer

    def list(self, request, *args, **kwargs):
        """Eagerly expire stale withdrawals before returning the list."""
        from datetime import timedelta
        from apps.payouts.tasks import STALE_MINUTES
        cutoff = timezone.now() - timedelta(minutes=STALE_MINUTES)
        stale_qs = WithdrawalRequest.objects.filter(
            status__in=['processing', 'otp_required'],
            updated_at__lt=cutoff,
        )
        for w in stale_qs:
            original_status = w.status
            w.status = 'failed'
            w.failure_reason = (
                f'Timed out — no Paystack confirmation within {STALE_MINUTES} min '
                f'(was: {original_status}). Contact Paystack support with the reference if funds were deducted.'
            )
            w.updated_at = timezone.now()
            w.save(update_fields=['status', 'failure_reason', 'updated_at'])
        return super().list(request, *args, **kwargs)

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        withdrawal = self.get_object()

        if withdrawal.status == 'completed':
            return Response(
                {
                    'status': False,
                    'transaction_id': None,
                    'message': 'Withdrawal is already completed.',
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        if withdrawal.status != 'pending':
            return Response(
                {
                    'status': False,
                    'transaction_id': None,
                    'message': f"Only pending withdrawals can be approved. Current status: {withdrawal.status}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        logger.info(
            'Admin approving withdrawal',
            extra={
                'withdrawal_id': str(withdrawal.id),
                'reference': withdrawal.reference,
                'admin_user_id': str(request.user.id),
            },
        )

        withdrawal.status = 'approved'
        withdrawal.save(update_fields=['status', 'updated_at'])
        enqueue_withdrawal(withdrawal)

        withdrawal.refresh_from_db()
        payload = {
            'status': 'queued',
            'message': 'Withdrawal queued for processing',
            'withdrawal': AdminWithdrawalApproveSerializer(withdrawal).data,
        }
        return Response(payload, status=status.HTTP_200_OK)
