import logging
from django.db import transaction
from django.utils import timezone

from apps.payouts.models import BankAccount, WithdrawalRequest, PayoutTransaction
from apps.payouts.services import PaystackService

logger = logging.getLogger(__name__)


class PayoutEngine:
    """
    Payout execution engine that coordinates withdrawal processing and Paystack transfers.
    Manages the entire workflow from approval to completion or failure.
    """

    def __init__(self):
        """Initialize PayoutEngine with PaystackService."""
        self.paystack = PaystackService()

    @transaction.atomic
    def process_withdrawal(self, withdrawal: WithdrawalRequest):
        """
        Process an approved withdrawal request through Paystack.

        Handles the complete withdrawal flow:
        1. Validates withdrawal status
        2. Ensures bank account recipient code exists
        3. Initiates Paystack transfer
        4. Creates transaction record
        5. Updates withdrawal status

        Args:
            withdrawal (WithdrawalRequest): The withdrawal request to process

        Returns:
            dict: {
                "status": bool (success/failure),
                "transaction_id": str (uuid) or None,
                "message": str (human-readable message)
            }
        """
        try:
            # Prevent duplicate processing
            if withdrawal.status in ["completed", "processing", "cancelled"]:
                message = f"Cannot process withdrawal with status: {withdrawal.status}"
                logger.warning(f"Duplicate processing attempt: {message}")
                return {
                    "status": False,
                    "transaction_id": None,
                    "message": message,
                }

            # Validate withdrawal is approved
            if withdrawal.status != "approved":
                message = f"Withdrawal not approved. Current status: {withdrawal.status}"
                logger.warning(f"Attempted to process non-approved withdrawal: {withdrawal.reference}")
                return {
                    "status": False,
                    "transaction_id": None,
                    "message": message,
                }

            logger.info(f"Processing withdrawal: {withdrawal.reference}")

            # Get the bank account
            try:
                bank_account = BankAccount.objects.get(id=withdrawal.bank_account_id)
            except BankAccount.DoesNotExist:
                message = "Bank account not found"
                logger.error(f"{message} for withdrawal {withdrawal.reference}")
                withdrawal.status = "failed"
                withdrawal.failure_reason = message
                withdrawal.save(update_fields=['status', 'failure_reason', 'updated_at'])
                return {
                    "status": False,
                    "transaction_id": None,
                    "message": message,
                }

            # Create or retrieve Paystack recipient code
            if not bank_account.recipient_code:
                logger.info("Creating Paystack recipient for bank account: %s", bank_account)
                recipient_result = self.paystack.create_transfer_recipient(
                    name=bank_account.account_name,
                    account_number=bank_account.account_number,
                    bank_code=bank_account.bank_code,
                    currency=withdrawal.currency,
                )

                if not recipient_result["status"]:
                    message = "Failed to create Paystack recipient"
                    failure_reason = str(recipient_result["response"])
                    logger.error(f"{message}: {failure_reason}")
                    withdrawal.status = "failed"
                    withdrawal.failure_reason = failure_reason
                    withdrawal.save(update_fields=['status', 'failure_reason', 'updated_at'])
                    return {
                        "status": False,
                        "transaction_id": None,
                        "message": message,
                    }

                recipient_code = recipient_result["recipient_code"]
                bank_account.recipient_code = recipient_code
                bank_account.save(update_fields=['recipient_code'])
                logger.info(f"Recipient code created and saved: {recipient_code}")
            else:
                recipient_code = bank_account.recipient_code
                logger.info(f"Using existing recipient code")

            # Initiate Paystack transfer
            logger.info(f"Initiating Paystack transfer for {withdrawal.amount} {withdrawal.currency}")
            transfer_result = self.paystack.initiate_transfer(
                amount=withdrawal.amount,
                recipient_code=recipient_code,
                reference=withdrawal.reference,
                reason="User withdrawal",
            )

            if not transfer_result["status"]:
                message = "Paystack transfer initiation failed"
                failure_reason = str(transfer_result["response"])
                logger.error(f"{message}: {failure_reason}")
                withdrawal.status = "failed"
                withdrawal.failure_reason = failure_reason
                withdrawal.save(update_fields=['status', 'failure_reason', 'updated_at'])
                return {
                    "status": False,
                    "transaction_id": None,
                    "message": message,
                }

            # Create PayoutTransaction record using immediate Paystack status.
            paystack_reference = transfer_result['response'].get('data', {}).get('reference')
            transfer_code = transfer_result["transfer_code"]
            paystack_transfer_status = transfer_result['response'].get('data', {}).get('status')
            
            # Check if OTP is required
            response_message = transfer_result['response'].get('message', '').lower()
            requires_otp = 'otp' in response_message or paystack_transfer_status == 'otp'
            
            if requires_otp:
                transaction_status = 'pending'
                withdrawal_status = 'otp_required'
                logger.info(f"OTP required for transfer: {transfer_code}")
            elif str(paystack_transfer_status).lower() == 'success':
                transaction_status = 'success'
                withdrawal_status = 'completed'
            else:
                transaction_status = 'pending'
                withdrawal_status = 'processing'

            payout_transaction = PayoutTransaction.objects.create(
                withdrawal=withdrawal,
                paystack_transfer_code=transfer_code,
                paystack_reference=paystack_reference or withdrawal.reference,
                amount=withdrawal.amount,
                status=transaction_status,
                response_payload=transfer_result['response'],
            )

            logger.info(f"PayoutTransaction created: {payout_transaction.id}")

            # Update withdrawal status based on Paystack response
            withdrawal.status = withdrawal_status
            withdrawal.processed_at = timezone.now()
            withdrawal.save(update_fields=['status', 'processed_at', 'updated_at'])

            logger.info(f"Withdrawal {withdrawal.reference} status: {withdrawal_status}")

            return {
                "status": True,
                "transaction_id": str(payout_transaction.id),
                "message": "Withdrawal processed successfully",
            }

        except Exception as e:
            logger.error(f"Unexpected error processing withdrawal {withdrawal.reference}: {str(e)}", exc_info=True)
            try:
                withdrawal.status = "failed"
                withdrawal.failure_reason = f"System error: {str(e)}"
                withdrawal.save(update_fields=['status', 'failure_reason', 'updated_at'])
            except Exception as save_error:
                logger.error(f"Failed to save withdrawal error state: {str(save_error)}")

            return {
                "status": False,
                "transaction_id": None,
                "message": "System error occurred during processing",
            }
