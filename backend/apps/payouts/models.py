import uuid
import string
import random
from datetime import datetime
from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class BankAccount(models.Model):
    """
    Stores user bank account information for payouts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bank_accounts')
    account_name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=20)
    bank_code = models.CharField(max_length=10)
    bank_name = models.CharField(max_length=255)
    recipient_code = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text="Paystack transfer recipient code"
    )
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['is_verified']),
        ]

    def __str__(self):
        if len(self.account_number) >= 4:
            masked = '****' + self.account_number[-4:]
        else:
            masked = self.account_number
        return f"{self.account_name} - {masked}"


class WithdrawalRequest(models.Model):
    """
    Tracks user withdrawal requests and their status through the payout pipeline.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('processing', 'Processing'),
        ('otp_required', 'OTP Required'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='withdrawal_requests')
    bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT, related_name='withdrawal_requests')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='NGN')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    reference = models.CharField(max_length=255, unique=True, db_index=True)
    admin_note = models.TextField(blank=True, null=True)
    failure_reason = models.TextField(null=True, blank=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(null=True, blank=True)

    class Meta:
        ordering = ['-requested_at']
        indexes = [
            models.Index(fields=['user', '-requested_at']),
            models.Index(fields=['status', '-requested_at']),
            models.Index(fields=['reference']),
        ]

    def save(self, *args, **kwargs):
        if not self.reference:
            today = datetime.now().strftime('%Y%m%d')
            random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
            self.reference = f'WDR-{today}-{random_suffix}'
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Withdrawal {self.reference} - {self.amount} {self.currency}"


class PayoutTransaction(models.Model):
    """
    Records individual Paystack transfer transactions for withdrawal requests.
    """
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    withdrawal = models.OneToOneField(
        WithdrawalRequest,
        on_delete=models.CASCADE,
        related_name='transaction'
    )
    paystack_transfer_code = models.CharField(max_length=255, null=True, blank=True, db_index=True)
    paystack_reference = models.CharField(max_length=255, unique=True, db_index=True)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending', db_index=True)
    response_payload = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['withdrawal', '-created_at']),
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['paystack_reference']),
        ]

    def __str__(self):
        return f"Transaction {self.paystack_reference} - {self.amount}"


class BudgetAllocation(models.Model):
    """
    Tracks annual budget allocations by organizational department.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    department = models.CharField(max_length=100, db_index=True)
    allocated_amount = models.DecimalField(max_digits=15, decimal_places=2)
    fiscal_year = models.IntegerField(default=2025, db_index=True)
    icon = models.CharField(max_length=50, default='account_balance')
    color = models.CharField(max_length=7, default='#64748b', help_text="Hex color code")
    display_order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'department']
        indexes = [
            models.Index(fields=['fiscal_year', 'department']),
            models.Index(fields=['fiscal_year', 'display_order']),
        ]
        unique_together = [['department', 'fiscal_year']]

    def __str__(self):
        return f"{self.department} (FY{self.fiscal_year}): ₦{self.allocated_amount}"


class FundReserve(models.Model):
    """
    Tracks designated fund reserves (e.g., Building Fund, Missions Fund).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    balance = models.DecimalField(max_digits=15, decimal_places=2)
    icon = models.CharField(max_length=50, default='account_balance_wallet')
    color = models.CharField(max_length=7, default='#94a3b8', help_text="Hex color code")
    note = models.CharField(max_length=200, blank=True, help_text="Purpose/description of the fund")
    fiscal_year = models.IntegerField(default=2025, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['fiscal_year']),
        ]

    def __str__(self):
        return f"{self.name}: ₦{self.balance}"
