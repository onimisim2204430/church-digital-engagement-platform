import logging

from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.payouts.models import BankAccount, WithdrawalRequest, BudgetAllocation, FundReserve
from apps.payouts.paystack import confirm_transfer_otp, verify_transfer_status
from apps.payouts.serializers import (
    AdminWithdrawalApproveSerializer,
    BankAccountSerializer,
    WithdrawalRequestSerializer,
    BudgetAllocationSerializer,
    FundReserveSerializer,
    BudgetSummarySerializer,
)
from apps.payouts.services import PaystackService
from apps.payouts.views import enqueue_withdrawal
from apps.users.permissions import IsAdmin

logger = logging.getLogger(__name__)

# Nigerian banks list for dropdown selection (production-ready)
NIGERIAN_BANKS = [
    {"code": "044", "name": "Access Bank"},
    {"code": "050", "name": "Ecobank Nigeria"},
    {"code": "011", "name": "First Bank Nigeria"},
    {"code": "058", "name": "Guaranty Trust Bank (GTBank)"},
    {"code": "074", "name": "Polaris Bank"},
    {"code": "039", "name": "Stanbic IBTC Bank"},
    {"code": "037", "name": "Stanchion Bank"},
    {"code": "033", "name": "United Bank For Africa (UBA)"},
    {"code": "035", "name": "WEMA Bank"},
    {"code": "057", "name": "Zenith Bank"},
    {"code": "001", "name": "FCMB Group"},
    {"code": "070", "name": "Fidelity Bank"},
    {"code": "051", "name": "Fidelity Bank"},
    {"code": "012", "name": "Standard Chartered Bank"},
    {"code": "014", "name": "GTBank Mobile"},
]


class WithdrawalViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """User withdrawal actions: submit and list own withdrawals."""

    serializer_class = WithdrawalRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return WithdrawalRequest.objects.filter(user=self.request.user).order_by('-requested_at')

    @action(detail=False, methods=['get'], url_path='banks')
    def list_banks(self, request):
        """
        GET /withdrawals/bank-accounts/banks/
        Returns all available Nigerian banks for dropdown selection.
        """
        return Response(NIGERIAN_BANKS, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get', 'post'], url_path='bank-accounts')
    def bank_accounts(self, request):
        if request.method.lower() == 'post':
            serializer = BankAccountSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)

            account_number = serializer.validated_data.get('account_number')
            bank_code = serializer.validated_data.get('bank_code')
            bank_name = serializer.validated_data.get('bank_name', '')
            
            # Get bank name from code if not provided
            if not bank_name:
                banks_map = {b['code']: b['name'] for b in NIGERIAN_BANKS}
                bank_name = banks_map.get(bank_code, '')

            # STEP 1: Resolve account name from Paystack
            # User provides only: account_number + bank_code
            # System automatically resolves the account holder's name
            logger.info(
                f"[ACCOUNT VERIFICATION] Resolving account",
                extra={'bank_code': bank_code, 'account_number_masked': account_number[-4:]}
            )
            paystack = PaystackService()
            resolve_result = paystack.resolve_account(account_number, bank_code)

            if not resolve_result['status']:
                error_msg = resolve_result['response'].get('message', 'Account not found')
                logger.error(
                    f"Account resolution failed",
                    extra={'error': error_msg, 'bank_code': bank_code}
                )
                return Response(
                    {
                        'detail': f'✗ Account verification failed: {error_msg}',
                        'field': 'account_number'
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

            account_name = resolve_result['account_name']
            logger.info(
                f"✓ Account verified: {account_name}",
                extra={'bank_code': bank_code, 'account_name': account_name}
            )

            # STEP 2: Get or create bank account with resolved name
            bank_account, created = BankAccount.objects.get_or_create(
                user=request.user,
                account_number=account_number,
                bank_code=bank_code,
                defaults={
                    'account_name': account_name,
                    'bank_name': bank_name,
                    'is_verified': True,  # Mark verified after successful name resolution
                },
            )

            if not created:
                # Update account details if same account/bank is reused
                changed = False
                if bank_account.account_name != account_name:
                    bank_account.account_name = account_name
                    changed = True
                if bank_account.bank_name != bank_name:
                    bank_account.bank_name = bank_name
                    changed = True
                if not bank_account.is_verified:
                    bank_account.is_verified = True
                    changed = True
                if changed:
                    bank_account.save(update_fields=['account_name', 'bank_name', 'is_verified', 'updated_at'])

            # STEP 3: Create Paystack recipient code (non-blocking)
            # If recipient code doesn't exist yet, create it (optional for account setup)
            if not bank_account.recipient_code:
                logger.info(
                    f"[RECIPIENT CODE] Creating for {account_name}",
                    extra={'bank_code': bank_code, 'account_name': account_name}
                )
                recipient_result = paystack.create_transfer_recipient(
                    name=account_name,
                    account_number=account_number,
                    bank_code=bank_code,
                    currency='NGN',
                )

                if recipient_result['status']:
                    # Only save if successful, otherwise will create on withdrawal
                    bank_account.recipient_code = recipient_result['recipient_code']
                    bank_account.save(update_fields=['recipient_code', 'updated_at'])
                    logger.info(
                        f"✓ Recipient code created immediately",
                        extra={'recipient_code': recipient_result['recipient_code']}
                    )
                else:
                    # Log the error but don't block account creation
                    logger.warning(
                        f"[RECIPIENT CODE] Could not create yet (will retry at withdrawal)",
                        extra={'error': recipient_result['response'].get('message', 'Unknown')}
                    )

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
            # Transfer is still processing - set withdrawal to processing
            # The webhook will eventually update it to completed
            withdrawal.status = 'processing'
            withdrawal.updated_at = timezone.now()
            withdrawal.save(update_fields=['status', 'updated_at'])
            # Keep transaction status as pending - webhook will update when transfer completes
            tx.status = 'pending'

        # Always save the OTP confirmation in the transaction payload
        payload = tx.response_payload if isinstance(tx.response_payload, dict) else {}
        payload['otp_finalize'] = {
            'status': 'ok',
            'message': message,
            'paystack_transfer_status': paystack_status,
            'confirmed_at': timezone.now().isoformat(),
        }
        tx.response_payload = payload
        tx.save(update_fields=['status', 'response_payload'])

        logger.info(
            f'OTP confirmed for withdrawal',
            extra={
                'withdrawal': withdrawal.reference,
                'transfer_code': transfer_code,
                'final_status': final_withdrawal_status,
                'paystack_status': paystack_status,
            }
        )

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


class BudgetViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only viewset for budget allocations and fund reserves."""

    permission_classes = [IsAdmin]
    queryset = BudgetAllocation.objects.all()
    serializer_class = BudgetAllocationSerializer

    @action(detail=False, methods=['get'])
    def allocations(self, request):
        """Get all budget allocations for the current fiscal year."""
        fiscal_year = request.query_params.get('fiscal_year', 2025)
        try:
            fiscal_year = int(fiscal_year)
        except (ValueError, TypeError):
            fiscal_year = 2025

        allocations = BudgetAllocation.objects.filter(
            fiscal_year=fiscal_year
        ).order_by('display_order')

        serializer = BudgetAllocationSerializer(allocations, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def reserves(self, request):
        """Get all fund reserves for the current fiscal year."""
        fiscal_year = request.query_params.get('fiscal_year', 2025)
        try:
            fiscal_year = int(fiscal_year)
        except (ValueError, TypeError):
            fiscal_year = 2025

        reserves = FundReserve.objects.filter(
            fiscal_year=fiscal_year
        ).order_by('-created_at')

        serializer = FundReserveSerializer(reserves, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get complete budget summary with calculated totals."""
        fiscal_year = request.query_params.get('fiscal_year', 2025)
        try:
            fiscal_year = int(fiscal_year)
        except (ValueError, TypeError):
            fiscal_year = 2025

        allocations = BudgetAllocation.objects.filter(
            fiscal_year=fiscal_year
        ).order_by('display_order')

        data = {
            'allocations': allocations,
            'fiscal_year': fiscal_year,
        }

        serializer = BudgetSummarySerializer(data)
        return Response(serializer.data, status=status.HTTP_200_OK)
