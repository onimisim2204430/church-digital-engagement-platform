from rest_framework import serializers
from decimal import Decimal
from django.db.models import Sum, Q
from django.utils import timezone

from apps.payouts.models import BankAccount, PayoutTransaction, WithdrawalRequest, BudgetAllocation, FundReserve


class BankAccountSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(required=False, allow_blank=True)
    bank_name = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = BankAccount
        fields = [
            'id',
            'account_name',
            'account_number',
            'bank_code',
            'bank_name',
            'recipient_code',
            'is_verified',
        ]
    
    def validate_account_number(self, value):
        """Account number must be exactly 10 digits (NUBAN format)."""
        value = str(value).strip()
        if len(value) != 10 or not value.isdigit():
            raise serializers.ValidationError(
                "Account number must be exactly 10 digits"
            )
        return value
    
    def validate_bank_code(self, value):
        """Bank code should be 3 digits."""
        if not value or len(str(value).strip()) != 3:
            raise serializers.ValidationError("Bank code must be 3 digits (e.g., 058)")
        return value


class PayoutTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayoutTransaction
        fields = [
            'id',
            'paystack_transfer_code',
            'paystack_reference',
            'status',
            'created_at',
        ]


class WithdrawalRequestSerializer(serializers.ModelSerializer):
    bank_account = serializers.PrimaryKeyRelatedField(
        queryset=BankAccount.objects.all(),
        write_only=True,
        required=True,
    )

    class Meta:
        model = WithdrawalRequest
        fields = [
            'id',
            'bank_account',
            'amount',
            'currency',
            'status',
            'requested_at',
            'processed_at',
            'failure_reason',
        ]
        read_only_fields = [
            'id',
            'status',
            'requested_at',
            'processed_at',
            'failure_reason',
        ]

    def validate_bank_account(self, value):
        request = self.context.get('request')
        if request and value.user_id != request.user.id:
            raise serializers.ValidationError('You can only withdraw to your own bank account.')
        return value

    def create(self, validated_data):
        request = self.context['request']
        bank_account = validated_data['bank_account']
        
        # Create the withdrawal
        withdrawal = WithdrawalRequest.objects.create(
            user=request.user,
            bank_account=bank_account,
            amount=validated_data['amount'],
            currency=validated_data.get('currency', 'NGN'),
            status='pending',
        )
        
        # Auto-approve and auto-enqueue if bank account is verified and has recipient code
        if bank_account.is_verified and bank_account.recipient_code:
            from apps.payouts.views import enqueue_withdrawal
            withdrawal.status = 'approved'
            withdrawal.updated_at = timezone.now()
            withdrawal.save(update_fields=['status', 'updated_at'])
            # Queue the withdrawal for processing
            enqueue_withdrawal(withdrawal)
        
        return withdrawal


class AdminWithdrawalApproveSerializer(serializers.ModelSerializer):
    transaction = PayoutTransactionSerializer(read_only=True)
    paystack_transfer_code = serializers.SerializerMethodField()

    def get_paystack_transfer_code(self, obj):
        tx = getattr(obj, 'transaction', None)
        return tx.paystack_transfer_code if tx else None

    class Meta:
        model = WithdrawalRequest
        fields = [
            'id',
            'reference',
            'user',
            'bank_account',
            'amount',
            'currency',
            'status',
            'requested_at',
            'processed_at',
            'failure_reason',
            'transaction',
            'paystack_transfer_code',
        ]
        read_only_fields = fields


class BudgetAllocationSerializer(serializers.ModelSerializer):
    """Serializer for BudgetAllocation with calculated spending."""
    spent = serializers.SerializerMethodField()

    class Meta:
        model = BudgetAllocation
        fields = [
            'id',
            'department',
            'allocated_amount',
            'spent',
            'icon',
            'color',
            'display_order',
            'fiscal_year',
        ]
        read_only_fields = fields

    def get_spent(self, obj):
        """
        Calculate total spent for this department.
        For now, sum all completed PayoutTransactions to approximate spending.
        """
        total = PayoutTransaction.objects.filter(
            status='success',
            withdrawal__requested_at__year=obj.fiscal_year,
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return float(total)


class FundReserveSerializer(serializers.ModelSerializer):
    """Serializer for FundReserve."""
    class Meta:
        model = FundReserve
        fields = [
            'id',
            'name',
            'balance',
            'icon',
            'color',
            'note',
            'fiscal_year',
        ]
        read_only_fields = fields


class BudgetSummarySerializer(serializers.Serializer):
    """Summary of budget allocations and totals."""
    allocations = BudgetAllocationSerializer(many=True)
    total_allocated = serializers.SerializerMethodField()
    total_spent = serializers.SerializerMethodField()
    total_remaining = serializers.SerializerMethodField()
    budget_usage_percent = serializers.SerializerMethodField()

    def get_total_allocated(self, obj):
        allocations = obj.get('allocations', [])
        return sum(Decimal(str(a.allocated_amount)) for a in allocations)

    def get_total_spent(self, obj):
        total = PayoutTransaction.objects.filter(
            status='success'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return float(total)

    def get_total_remaining(self, obj):
        allocated = self.get_total_allocated(obj)
        spent = self.get_total_spent(obj)
        return float(allocated - Decimal(str(spent)))

    def get_budget_usage_percent(self, obj):
        allocated = self.get_total_allocated(obj)
        spent = self.get_total_spent(obj)
        if allocated <= 0:
            return 0
        return int((Decimal(str(spent)) / allocated) * 100)
