from rest_framework import serializers

from apps.payouts.models import BankAccount, PayoutTransaction, WithdrawalRequest


class BankAccountSerializer(serializers.ModelSerializer):
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
        return WithdrawalRequest.objects.create(
            user=request.user,
            bank_account=validated_data['bank_account'],
            amount=validated_data['amount'],
            currency=validated_data.get('currency', 'NGN'),
            status='pending',
        )


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
