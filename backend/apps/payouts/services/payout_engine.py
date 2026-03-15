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
                
                # Send email notification for failure
                from apps.payouts.tasks import send_withdrawal_notification_and_email, send_withdrawal_admin_notification
                send_withdrawal_notification_and_email.delay(
                    withdrawal_id=str(withdrawal.id),
                    status_after_processing='failed'
                )
                send_withdrawal_admin_notification.delay(
                    withdrawal_id=str(withdrawal.id),
                    status='failed'
                )
                
                return {
                    "status": False,
                    "transaction_id": None,
                    "message": message,
                }

            # Create or retrieve Paystack recipient code
            if not bank_account.recipient_code:
                logger.info(
                    f"[DEBUG] Creating Paystack recipient for bank account",
                    extra={
                        'account_name': bank_account.account_name,
                        'account_number_masked': bank_account.account_number[-4:],
                        'bank_code': bank_account.bank_code,
                        'withdrawal_reference': withdrawal.reference,
                    }
                )
                recipient_result = self.paystack.create_transfer_recipient(
                    name=bank_account.account_name,
                    account_number=bank_account.account_number,
                    bank_code=bank_account.bank_code,
                    currency=withdrawal.currency,
                )

                if not recipient_result["status"]:
                    # Check if this is a test mode limitation
                    error_msg = str(recipient_result["response"].get("message", ""))
                    is_test_mode_error = "Cannot resolve account" in error_msg or "invalid_bank_code" in error_msg
                    
                    if is_test_mode_error:
                        # In test mode, create a mock recipient code for testing transfers
                        import uuid
                        mock_recipient_code = f"RCP_TEST_{uuid.uuid4().hex[:20].upper()}"
                        logger.warning(
                            f"[PAYSTACK TEST MODE] Using fallback recipient code (transfer may fail later)",
                            extra={
                                'withdrawal': withdrawal.reference,
                                'fallback_code': mock_recipient_code,
                                'bank_code': bank_account.bank_code,
                                'error': error_msg,
                            }
                        )
                        recipient_code = mock_recipient_code
                    else:
                        # Real error - not a test mode issue
                        message = "Failed to create Paystack recipient"
                        failure_reason = str(recipient_result["response"])
                        logger.error(
                            f"[DEBUG] Recipient creation failed for withdrawal",
                            extra={
                                'withdrawal': withdrawal.reference,
                                'failure_reason': failure_reason,
                                'bank_code': bank_account.bank_code,
                                'account_number_masked': bank_account.account_number[-4:],
                            }
                        )
                        withdrawal.status = "failed"
                        withdrawal.failure_reason = failure_reason
                        withdrawal.save(update_fields=['status', 'failure_reason', 'updated_at'])
                        
                        # Send email notification for failure
                        from apps.payouts.tasks import send_withdrawal_notification_and_email, send_withdrawal_admin_notification
                        send_withdrawal_notification_and_email.delay(
                            withdrawal_id=str(withdrawal.id),
                            status_after_processing='failed'
                        )
                        send_withdrawal_admin_notification.delay(
                            withdrawal_id=str(withdrawal.id),
                            status='failed'
                        )
                        
                        return {
                            "status": False,
                            "transaction_id": None,
                            "message": message,
                        }

                if not is_test_mode_error:
                    # Only save if it was a real creation (not a fallback)
                    bank_account.recipient_code = recipient_code
                    bank_account.save(update_fields=['recipient_code'])
                    logger.info(
                        f"[DEBUG] Recipient code created and saved",
                        extra={'recipient_code': recipient_code, 'withdrawal': withdrawal.reference}
                    )
            else:
                logger.info(
                    f"[DEBUG] Using existing recipient code",
                    extra={
                        'recipient_code': bank_account.recipient_code,
                        'withdrawal': withdrawal.reference,
                    }
                )
                recipient_code = bank_account.recipient_code

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
                
                # Send email notification for failure
                from apps.payouts.tasks import send_withdrawal_notification_and_email, send_withdrawal_admin_notification
                send_withdrawal_notification_and_email.delay(
                    withdrawal_id=str(withdrawal.id),
                    status_after_processing='failed'
                )
                send_withdrawal_admin_notification.delay(
                    withdrawal_id=str(withdrawal.id),
                    status='failed'
                )
                
                return {
                    "status": False,
                    "transaction_id": None,
                    "message": message,
                }

            # Create PayoutTransaction record using immediate Paystack status.
            paystack_reference = transfer_result['response'].get('data', {}).get('reference')
            transfer_code = transfer_result["transfer_code"]
            paystack_transfer_status = transfer_result['response'].get('data', {}).get('status')
            response_message = transfer_result['response'].get('message', '').lower()
            
            # Detailed OTP Detection Logging
            import json
            logger.info(
                f"[OTP DETECTION] Transfer Response Analysis",
                extra={
                    'withdrawal_reference': withdrawal.reference,
                    'transfer_code': transfer_code,
                    'response_status': paystack_transfer_status,
                    'response_message': response_message if response_message else 'N/A',
                    'full_response': json.dumps(transfer_result['response'], indent=2, default=str),
                }
            )
            
            # Check if OTP is required
            otp_in_message = 'otp' in response_message
            otp_in_status = str(paystack_transfer_status).lower() == 'otp'
            requires_otp = otp_in_message or otp_in_status
            
            logger.info(
                f"[OTP DETECTION RESULT] requires_otp={requires_otp}",
                extra={
                    'withdrawal_reference': withdrawal.reference,
                    'otp_in_message': otp_in_message,
                    'otp_in_status': otp_in_status,
                    'paystack_status': paystack_transfer_status,
                }
            )
            
            if requires_otp:
                transaction_status = 'pending'
                withdrawal_status = 'otp_required'
                logger.warning(
                    f"[OTP REQUIRED] Withdrawal {withdrawal.reference} needs OTP confirmation",
                    extra={'transfer_code': transfer_code, 'user_email': withdrawal.user.email}
                )
            elif str(paystack_transfer_status).lower() == 'success':
                transaction_status = 'success'
                withdrawal_status = 'completed'
                logger.info(f"Transfer successful immediately: {transfer_code}")
            else:
                transaction_status = 'pending'
                withdrawal_status = 'processing'
                logger.info(f"Transfer in processing state: {transfer_code}")

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

            # Send notifications and emails in background
            from apps.payouts.tasks import send_withdrawal_notification_and_email, send_withdrawal_admin_notification
            
            send_withdrawal_notification_and_email.delay(
                withdrawal_id=str(withdrawal.id),
                status_after_processing=withdrawal_status
            )
            
            # Notify admins for pending, completed, and failed statuses
            if withdrawal_status in ['completed', 'failed']:
                send_withdrawal_admin_notification.delay(
                    withdrawal_id=str(withdrawal.id),
                    status=withdrawal_status
                )

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
                
                # Send email notification for failure
                from apps.payouts.tasks import send_withdrawal_notification_and_email, send_withdrawal_admin_notification
                send_withdrawal_notification_and_email.delay(
                    withdrawal_id=str(withdrawal.id),
                    status_after_processing='failed'
                )
                send_withdrawal_admin_notification.delay(
                    withdrawal_id=str(withdrawal.id),
                    status='failed'
                )
                
            except Exception as save_error:
                logger.error(f"Failed to save withdrawal error state: {str(save_error)}")

            return {
                "status": False,
                "transaction_id": None,
                "message": "System error occurred during processing",
            }
